import os

from playwright.async_api import Browser, BrowserContext, Page


class BrowserSession:
    def __init__(self, browser: Browser, request=None):
        self.browser: Browser = browser
        self.context: BrowserContext = None
        self.page: Page = None
        self.recording_dir: str = "tests/e2e/recordings"
        self.name = "session"
        self.request = request
        self.recording_enabled = os.getenv("PYTEST_RECORD") == "1"

    def set_name(self, name: str):
        self.name = name

    async def start(self, **context_options):
        if self.recording_enabled:
            os.makedirs(self.recording_dir, exist_ok=True)

        default_options = {
            "viewport": {
                "width": 1280,
                "height": 720,
            },
        }

        if self.recording_enabled:
            default_options.update(
                {
                    "record_video_dir": f"{self.recording_dir}/videos/",
                    "record_video_size": {
                        "width": 1280,
                        "height": 720,
                    },
                }
            )

        final_options = {**default_options, **context_options}

        self.context = await self.browser.new_context(**final_options)

        if self.recording_enabled:
            await self.context.tracing.start(
                screenshots=True, snapshots=True, sources=True
            )

        self.page = await self.context.new_page()
        return self.page

    async def stop(self, test_failed: bool):
        video_path = None

        if self.page:
            if self.recording_enabled and self.page.video:
                video_path = await self.page.video.path()

            await self.page.close()
            self.page = None

        if self.context:
            if self.recording_enabled:
                await self.context.tracing.stop(
                    path=f"{self.recording_dir}/traces/{self.name}.zip"
                )
            await self.context.close()
            self.context = None

        if self.recording_enabled and video_path:
            if test_failed:
                os.rename(video_path, f"{self.recording_dir}/videos/{self.name}.mp4")
            else:
                # Delete video if test passed
                if os.path.exists(video_path):
                    os.remove(video_path)

    async def screenshot(self, name: str = None):
        if self.recording_enabled and self.page:
            name = name or self.name
            screenshot_path = f"{self.recording_dir}/screenshots/{name}.png"
            await self.page.screenshot(path=screenshot_path)
            return screenshot_path
