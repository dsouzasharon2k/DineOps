import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = "http://localhost:5173"
TENANT_ID = "a085284e-ca00-4f64-a2c7-42fc0572bb97"
MENU_URL = f"{BASE_URL}/menu/{TENANT_ID}"


class TestPublicMenu:
    """E2E tests for the public menu page"""

    def test_menu_page_loads(self, driver):
        """Menu page should load and show restaurant name"""
        driver.get(MENU_URL)
        wait = WebDriverWait(driver, 10)
        header = wait.until(EC.visibility_of_element_located((By.TAG_NAME, "h1")))
        assert header.is_displayed()
        assert len(header.text) > 0

    def test_category_tabs_visible(self, driver):
        """Category tabs should be visible"""
        driver.get(MENU_URL)
        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//button[contains(@class,'rounded-full')]")
        ))
        buttons = driver.find_elements(By.XPATH, "//button[contains(@class,'rounded-full')]")
        assert len(buttons) > 0, "No category tabs found"

    def test_menu_items_visible(self, driver):
        """Menu items should be displayed under active category"""
        driver.get(MENU_URL)
        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//div[contains(@class,'bg-white') and contains(@class,'rounded-xl')]")
        ))
        items = driver.find_elements(
            By.XPATH, "//div[contains(@class,'bg-white') and contains(@class,'rounded-xl')]"
        )
        assert len(items) > 0, "No menu items found"

    def test_add_item_to_cart(self, driver):
        """Clicking ADD should show quantity controls and cart bar"""
        driver.get(MENU_URL)
        # Clear cart from localStorage so ADD button is visible
        driver.execute_script("localStorage.removeItem('dineops_cart');")
        driver.refresh()

        wait = WebDriverWait(driver, 10)
        add_btn = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[text()='ADD']")
        ))
        add_btn.click()

        # Cart bar button contains "View Order" in a child span
        cart_bar = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//button[contains(., 'View Order')]")
        ))
        assert cart_bar.is_displayed(), "Cart bar not visible after adding item"

    def test_track_order_link_visible(self, driver):
        """Track Order link should be visible in header"""
        driver.get(MENU_URL)
        wait = WebDriverWait(driver, 10)
        track_link = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//button[contains(text(),'Track Order')]")
        ))
        assert track_link.is_displayed()

    def test_navigate_to_track_order(self, driver):
        """Clicking Track Order should navigate to tracking page"""
        driver.get(MENU_URL)
        wait = WebDriverWait(driver, 10)
        track_link = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Track Order')]")
        ))
        track_link.click()
        wait.until(EC.url_contains("/track"))
        assert "/track" in driver.current_url
