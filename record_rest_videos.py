import asyncio
from playwright.async_api import async_playwright
import os

VIDEOS_DIR = r"c:\Apps\python\Invoice_Project_Lead\NotebookLM_Documentation\Training_Modules\videos"

async def login(page):
    await page.goto("https://localhost:7223/")
    await page.wait_for_timeout(1000)
    await page.fill("input[type='text']", "fthoresen")
    await page.fill("input[type='password']", "123Tse456!")
    # Specifically click the Sign In button
    await page.click("button:has-text('Sign In')")
    await page.wait_for_selector("text=Projects")
    await page.wait_for_timeout(2000)

async def create_context(browser, name):
    return await browser.new_context(
        viewport={"width": 1920, "height": 1080},
        record_video_dir=os.path.join(VIDEOS_DIR, name),
        record_video_size={"width": 1920, "height": 1080},
        ignore_https_errors=True
    )

async def mod2_milestones(browser):
    print("Recording Module 2: Milestones...")
    context = await create_context(browser, "mod2")
    page = await context.new_page()
    try:
        await login(page)
        await page.goto("https://localhost:7223/portal/projects")
        await page.wait_for_timeout(2000)
        
        if await page.locator("table.data-table tbody tr").count() > 0:
            await page.click("table.data-table tbody tr:first-child")
        else:
            await page.click(".grid-container .card:first-child")
            
        await page.wait_for_url("**/portal/projects/**")
        await page.wait_for_timeout(2000)
        
        await page.click("button:has-text('Milestones')")
        await page.wait_for_timeout(1000)
        
        await page.click("button:has-text('Add Milestone')")
        await page.wait_for_timeout(1000)
        
        await page.fill("input[name='name']", "Hardware Design")
        if await page.locator("input[name='budget']").count() > 0:
            await page.fill("input[name='budget']", "5000")
            
        await page.click("button:has-text('Save Project'), button:has-text('Save Milestone'), button:has-text('Save')")
        await page.wait_for_timeout(4000)
    except Exception as e:
        print("Mod 2 failed.")
    finally:
        await context.close()

async def mod3_gantt(browser):
    print("Recording Module 3: Gantt Chart...")
    context = await create_context(browser, "mod3")
    page = await context.new_page()
    try:
        await login(page)
        await page.goto("https://localhost:7223/portal/projects")
        await page.wait_for_timeout(2000)
        
        if await page.locator("table.data-table tbody tr").count() > 0:
            await page.click("table.data-table tbody tr:first-child")
        else:
            await page.click(".grid-container .card:first-child")
            
        await page.wait_for_url("**/portal/projects/**")
        await page.wait_for_timeout(2000)
        
        await page.click("button:has-text('Timeline/Gantt')")
        await page.wait_for_timeout(5000) # Just show the chart rendering
    except Exception as e:
        print("Mod 3 failed.")
    finally:
        await context.close()

async def mod4_tasks(browser):
    print("Recording Module 4: Task Management...")
    context = await create_context(browser, "mod4")
    page = await context.new_page()
    try:
        await login(page)
        await page.goto("https://localhost:7223/portal/tasks")
        await page.wait_for_timeout(2000)
        
        await page.click("button:has-text('New Task'), button:has-text('+ Task')")
        await page.wait_for_timeout(1000)
        
        if await page.locator("input[name='title']").count() > 0:
            await page.fill("input[name='title']", "Review Design Docs")
            
        project_select = page.locator("select[name='project_id']")
        if await project_select.count() > 0 and await project_select.locator("option").count() > 1:
            await project_select.select_option(index=1)
            
        await page.click("button:has-text('Save Task'), button:has-text('Save')")
        await page.wait_for_timeout(4000)
    except Exception as e:
        print("Mod 4 failed.")
    finally:
        await context.close()

async def mod5_timesheets(browser):
    print("Recording Module 5: Timesheets...")
    context = await create_context(browser, "mod5")
    page = await context.new_page()
    try:
        await login(page)
        await page.goto("https://localhost:7223/portal/timesheets")
        await page.wait_for_timeout(2000)
        
        if await page.locator("button:has-text('Log Time')").count() > 0:
            await page.click("button:has-text('Log Time')")
            await page.wait_for_timeout(1000)
            if await page.locator("input[name='hours']").count() > 0:
                await page.fill("input[name='hours']", "4")
            await page.click("button:has-text('Save Log'), button:has-text('Save')")
        await page.wait_for_timeout(4000)
    except Exception as e:
        print("Mod 5 failed.")
    finally:
        await context.close()

async def mod6_expenses(browser):
    print("Recording Module 6: Expenses...")
    context = await create_context(browser, "mod6")
    page = await context.new_page()
    try:
        await login(page)
        await page.goto("https://localhost:7223/portal/expenses")
        await page.wait_for_timeout(2000)
        
        if await page.locator("button:has-text('New Expense'), button:has-text('Add Expense')").count() > 0:
            await page.click("button:has-text('New Expense'), button:has-text('Add Expense')")
            await page.wait_for_timeout(1000)
            
            if await page.locator("input[name='merchant']").count() > 0:
                await page.fill("input[name='merchant']", "Home Depot")
            if await page.locator("input[name='amount']").count() > 0:
                await page.fill("input[name='amount']", "250.00")
                
            await page.click("button:has-text('Submit Expense'), button:has-text('Save Expense'), button:has-text('Submit'), button:has-text('Save')")
        await page.wait_for_timeout(4000)
    except Exception as e:
        print("Mod 6 failed.")
    finally:
        await context.close()

async def mod7_invoicing(browser):
    print("Recording Module 7: Invoicing...")
    context = await create_context(browser, "mod7")
    page = await context.new_page()
    try:
        await login(page)
        await page.goto("https://localhost:7223/portal/invoices")
        await page.wait_for_timeout(2000)
        
        if await page.locator("button:has-text('Generate Invoice'), button:has-text('New Invoice')").count() > 0:
            await page.click("button:has-text('Generate Invoice'), button:has-text('New Invoice')")
            await page.wait_for_timeout(2000)
            
            project_select = page.locator("select[name='project_id']")
            if await project_select.count() > 0 and await project_select.locator("option").count() > 1:
                await project_select.select_option(index=1)
                await page.wait_for_timeout(1000)
                
            await page.click("button:has-text('Create Invoice'), button:has-text('Submit'), button:has-text('Save')")
        await page.wait_for_timeout(4000)
    except Exception as e:
        print("Mod 7 failed.")
    finally:
        await context.close()

async def record_all():
    os.makedirs(VIDEOS_DIR, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, slow_mo=600)
        await mod2_milestones(browser)
        await mod3_gantt(browser)
        await mod4_tasks(browser)
        await mod5_timesheets(browser)
        await mod6_expenses(browser)
        await mod7_invoicing(browser)
        await browser.close()
        print("All recordings finished.")

if __name__ == "__main__":
    asyncio.run(record_all())
