import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path so tests can import modules directly.
TEST_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(TEST_DIR))

# Provide lightweight stubs for app modules that require external dependencies.
import types
app_pkg = types.ModuleType("app")
app_detector = types.ModuleType("app.detector")
app_detector.detect_anomalies = lambda raw_text: {
    "status": "SAFE",
    "risk": 0,
    "recommendation": "No issues detected.",
    "findings": [],
}
app_gemini = types.ModuleType("app.gemini")
app_gemini.explain_charger = lambda charger: "summary"
app_pkg.detector = app_detector
app_pkg.gemini = app_gemini
sys.modules["app"] = app_pkg
sys.modules["app.detector"] = app_detector
sys.modules["app.gemini"] = app_gemini

import cloud_parser
import station_service


class StationMappingTests(unittest.TestCase):
    def test_load_station_mapping_valid(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            mapping_path = Path(temp_dir) / "charger_station_map.csv"
            mapping_path.write_text(
                "log_file,nlr_station_id\n"
                "test.csv,12345\n"
                "other.csv,67890\n",
                encoding="utf-8",
            )

            with patch.object(cloud_parser, "STATION_MAPPING_FILE", mapping_path):
                mapping = cloud_parser.load_station_mapping()

            self.assertEqual(mapping, {
                "test.csv": {"nlr_station_id": "12345", "station_lat": "", "station_lng": "", "station_name": ""},
                "other.csv": {"nlr_station_id": "67890", "station_lat": "", "station_lng": "", "station_name": ""},
            })

    def test_load_station_mapping_missing_file(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            missing_path = Path(temp_dir) / "charger_station_map.csv"
            with patch.object(cloud_parser, "STATION_MAPPING_FILE", missing_path):
                with patch("builtins.print") as mocked_print:
                    mapping = cloud_parser.load_station_mapping()

            self.assertEqual(mapping, {})
            mocked_print.assert_called_once()
            self.assertIn("Station mapping file not found", str(mocked_print.call_args))

    def test_load_station_mapping_missing_required_columns(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            mapping_path = Path(temp_dir) / "charger_station_map.csv"
            mapping_path.write_text(
                "bad_column,other\n"
                "test.csv,12345\n",
                encoding="utf-8",
            )
            with patch.object(cloud_parser, "STATION_MAPPING_FILE", mapping_path):
                with self.assertRaises(ValueError) as exc:
                    cloud_parser.load_station_mapping()

            self.assertIn("missing required columns", str(exc.exception).lower())

    def test_load_station_mapping_duplicate_log_file(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            mapping_path = Path(temp_dir) / "charger_station_map.csv"
            mapping_path.write_text(
                "log_file,nlr_station_id\n"
                "test.csv,12345\n"
                "test.csv,67890\n",
                encoding="utf-8",
            )
            with patch.object(cloud_parser, "STATION_MAPPING_FILE", mapping_path):
                with self.assertRaises(ValueError) as exc:
                    cloud_parser.load_station_mapping()

            self.assertIn("duplicate log_file entry", str(exc.exception).lower())


class BuildChargersTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.backend_dir = Path(self.temp_dir.name)

        self.log_dir = self.backend_dir / "EV_logs"
        self.log_dir.mkdir()
        self.mapping_file = self.backend_dir / "charger_station_map.csv"
        self.metadata_file = self.backend_dir / "charger_metadata.csv"

        patch.object(cloud_parser, "LOG_DIR", self.log_dir).start()
        patch.object(cloud_parser, "STATION_MAPPING_FILE", self.mapping_file).start()
        patch.object(cloud_parser, "METADATA_FILE", self.metadata_file).start()

    def tearDown(self):
        patch.stopall()

    def test_build_chargers_log_without_mapping_falls_back(self):
        log_path = self.log_dir / "unmapped.csv"
        log_path.write_text("timestamp,source,event\n", encoding="utf-8")

        with patch.object(cloud_parser, "load_station_mapping", return_value={}), patch.object(
            cloud_parser, "load_metadata", return_value={
            }), patch.object(cloud_parser, "fetch_orlando_stations", return_value=[]), patch.object(
            cloud_parser, "analyze_charger", return_value={
                "log_file": "unmapped.csv",
                "status": "SAFE",
                "risk": 0,
                "name": "unmapped",
            }), patch("builtins.print") as mocked_print:
            results = cloud_parser.build_chargers()

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["log_file"], "unmapped.csv")
        mocked_print.assert_any_call(
            f"Warning: No station mapping for log {log_path.name}. "
            "Using local metadata fallback."
        )

    def test_build_chargers_mapping_station_id_not_returned(self):
        log_path = self.log_dir / "mapped.csv"
        log_path.write_text("timestamp,source,event\n", encoding="utf-8")

        with patch.object(cloud_parser, "load_station_mapping", return_value={"mapped.csv": {"nlr_station_id": "999", "station_lat": "", "station_lng": "", "station_name": ""}}), patch.object(
            cloud_parser, "load_metadata", return_value={
            }), patch.object(cloud_parser, "fetch_orlando_stations", return_value=[]), patch.object(
            cloud_parser, "fetch_station_by_id", side_effect=RuntimeError("not found")), patch.object(
            cloud_parser, "analyze_charger", return_value={
                "log_file": "mapped.csv",
                "status": "SAFE",
                "risk": 0,
                "name": "mapped",
            }), patch("builtins.print") as mocked_print:
            results = cloud_parser.build_chargers()

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["log_file"], "mapped.csv")
        self.assertTrue(any("Direct lookup for station ID 999 failed" in str(call) for call in mocked_print.call_args_list))
        self.assertTrue(any("No station mapping for log" not in str(call) for call in mocked_print.call_args_list))

    def test_build_chargers_multiple_logs_same_station_warns(self):
        log_a = self.log_dir / "a.csv"
        log_b = self.log_dir / "b.csv"
        log_a.write_text("timestamp,source,event\n", encoding="utf-8")
        log_b.write_text("timestamp,source,event\n", encoding="utf-8")

        with patch.object(cloud_parser, "load_station_mapping", return_value={
            "a.csv": {"nlr_station_id": "111", "station_lat": "", "station_lng": "", "station_name": ""},
            "b.csv": {"nlr_station_id": "111", "station_lat": "", "station_lng": "", "station_name": ""},
        }), patch.object(cloud_parser, "load_metadata", return_value={
        }), patch.object(cloud_parser, "fetch_orlando_stations", return_value=[]), patch.object(
            cloud_parser, "fetch_station_by_id", return_value={
                "id": "111",
                "name": "Station 111",
                "location": {"lat": 0.0, "lng": 0.0},
            }), patch.object(
            cloud_parser, "analyze_charger", return_value={
                "log_file": "a.csv",
                "status": "SAFE",
                "risk": 0,
                "name": "a",
            }), patch("builtins.print") as mocked_print:
            cloud_parser.build_chargers()

        self.assertTrue(any("mapped from multiple log files" in str(call) for call in mocked_print.call_args_list))


class StationServiceTests(unittest.TestCase):
    @patch("station_service.urlopen")
    def test_fetch_station_by_id_normalization(self, mocked_urlopen):
        payload = {
            "fuel_stations": [
                {
                    "id": 123,
                    "station_name": "Test Station",
                    "latitude": 28.5,
                    "longitude": -81.0,
                }
            ]
        }
        response = io.StringIO(io.StringIO().read())
        response = io.StringIO(json.dumps(payload))
        mocked_urlopen.return_value.__enter__.return_value = response

        with patch.object(station_service, "get_nlr_api_key", return_value="key"):
            result = station_service.fetch_station_by_id("123")

        self.assertEqual(result["id"], 123)
        self.assertEqual(result["name"], "Test Station")
        self.assertEqual(result["location"], {"lat": 28.5, "lng": -81.0})

    @patch("station_service.urlopen", side_effect=station_service.URLError("fail"))
    def test_fetch_station_by_id_failure_raises(self, mocked_urlopen):
        with patch.object(station_service, "get_nlr_api_key", return_value="key"):
            with self.assertRaises(RuntimeError) as exc:
                station_service.fetch_station_by_id("123")

        self.assertIn("Could not connect to the NLR API", str(exc.exception))


if __name__ == "__main__":
    unittest.main()
