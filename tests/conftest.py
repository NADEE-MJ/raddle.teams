import os

# Only enable the e2e pytest plugin when explicitly requested.
# This avoids importing browser/server fixtures during quick unit test runs.
if os.getenv("RADDLE_ENABLE_E2E"):
	pytest_plugins = ["tests.e2e.conftest"]
