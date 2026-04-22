import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        await page.goto("http://localhost:8080/")
        
        # Get bounding boxes for main layout blocks
        page_content_box = await page.locator(".page-content").bounding_box()
        view_dashboard_box = await page.locator("#view-dashboard").bounding_box()
        footer_box = await page.locator(".global-footer").bounding_box()
        
        print("Page Content Box:", page_content_box)
        print("View Dashboard Box:", view_dashboard_box)
        print("Footer Box:", footer_box)
        
        await browser.close()

asyncio.run(main())
