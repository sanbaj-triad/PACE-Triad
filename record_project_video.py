import asyncio
from playwright.async_api import async_playwright
import os
import shutil

async def record_video():
    videos_dir = r"c:\Apps\python\Invoice_Project_Lead\NotebookLM_Documentation\Training_Modules\videos"
    
    # Clean up old videos so we only have one new one
    if os.path.exists(videos_dir):
        shutil.rmtree(videos_dir)
    os.makedirs(videos_dir, exist_ok=True)
    
    async with async_playwright() as p:
        # slow_mo adds a 500ms delay between actions so the video isn't too fast
        browser = await p.chromium.launch(headless=True, slow_mo=600)
        
        # We explicitly set the viewport and video size to 1920x1080 (Full HD)
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=videos_dir,
            record_video_size={"width": 1920, "height": 1080},
            ignore_https_errors=True
        )
        page = await context.new_page()
        
        print("Navigating to login page...")
        await page.goto("https://localhost:7223/")
        await page.wait_for_timeout(1000) # give a second to see the login screen
        
        print("Logging in...")
        await page.fill("input[type='text']", "fthoresen")
        await page.fill("input[type='password']", "123Tse456!")
        await page.click("button[type='submit']")
        
        print("Waiting for dashboard to load...")
        # Wait for the sidebar to appear
        await page.wait_for_selector("text=Projects")
        await page.wait_for_timeout(2000) # Wait a bit on the dashboard
        
        print("Navigating to Projects list...")
        await page.goto("https://localhost:7223/portal/projects")
        
        print("Waiting for Project List to load...")
        # Wait for the "New Project" button to appear
        await page.wait_for_selector("button:has-text('+ New Project')")
        await page.wait_for_timeout(2000) # Give the user time to see the list
        
        print("Clicking + New Project...")
        await page.click("button:has-text('+ New Project')")
        
        print("Waiting for Project Form to load...")
        await page.wait_for_selector("input[name='name']")
        await page.wait_for_timeout(1000)
        
        print("Filling out project form...")
        await page.fill("input[name='name']", "Alpha Integration Project")
        await page.wait_for_timeout(500)
        
        # Select customer
        customer_select = page.locator("select[name='customer_id']")
        if await customer_select.locator("option").count() > 1:
            await customer_select.select_option(index=1)
        await page.wait_for_timeout(500)
            
        await page.fill("input[name='customer_po']", "PO-2026-999")
        await page.wait_for_timeout(500)
        
        # Select Location
        location_select = page.locator("select[name='location_id']")
        if await location_select.locator("option").count() > 1:
            await location_select.select_option(index=1)
        await page.wait_for_timeout(500)
            
        # Select Internal PM
        pm_select = page.locator("select[name='pm_id']")
        if await pm_select.locator("option").count() > 1:
            await pm_select.select_option(index=1)
        await page.wait_for_timeout(500)
            
        # Select Project Type
        type_select = page.locator("select[name='project_type']")
        if await type_select.locator("option").count() > 1:
            await type_select.select_option(value="Automation System")
        await page.wait_for_timeout(1000)
            
        print("Submitting form...")
        await page.click("button:has-text('Save Project')")
        
        print("Waiting for creation to finish and redirect...")
        # Wait until we are redirected back to the project list or details
        await page.wait_for_url("**/portal/projects**", timeout=10000)
        
        # Wait 4 seconds on the final screen so the user can see the result
        await page.wait_for_timeout(4000) 
        
        await context.close()
        await browser.close()
        print("Video recording completed successfully!")

if __name__ == "__main__":
    asyncio.run(record_video())
