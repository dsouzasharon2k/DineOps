import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = "http://localhost:5173"


class TestLogin:
    """E2E tests for the login page"""

    def test_login_page_loads(self, driver):
        """Login page should show email and password fields"""
        driver.get(f"{BASE_URL}/login")
        wait = WebDriverWait(driver, 10)

        email_field = wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//input[@type='email' or @name='email']")
            )
        )
        assert email_field.is_displayed()

    def test_login_with_invalid_credentials(self, driver):
        """Login with wrong credentials should show error"""
        driver.get(f"{BASE_URL}/login")
        wait = WebDriverWait(driver, 10)

        # Fill in wrong credentials
        email = wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//input[@type='email' or @name='email']")
            )
        )
        email.clear()
        email.send_keys("wrong@example.com")

        password = driver.find_element(
            By.XPATH, "//input[@type='password']"
        )
        password.clear()
        password.send_keys("wrongpassword")

        # Submit
        submit = driver.find_element(
            By.XPATH, "//button[contains(text(),'Login')]"
        )
        submit.click()

        # Error message should appear (frontend shows "Login failed. Please try again.")
        error = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//*[contains(text(),'Login failed') or contains(text(),'Please try again') or contains(@class,'text-red')]",
                )
            )
        )
        assert error.is_displayed()

    def test_login_with_valid_credentials(self, driver):
        """Login with correct credentials should redirect to dashboard"""
        driver.get(f"{BASE_URL}/login")
        wait = WebDriverWait(driver, 10)

        email = wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//input[@type='email' or @name='email']")
            )
        )
        email.clear()
        email.send_keys("sharon@dineops.com")

        password = driver.find_element(
            By.XPATH, "//input[@type='password']"
        )
        password.clear()
        password.send_keys("password123")

        submit = driver.find_element(
            By.XPATH, "//button[contains(text(),'Login')]"
        )
        submit.click()

        # Should redirect to dashboard
        wait.until(EC.url_contains("/dashboard"))
        assert "/dashboard" in driver.current_url

    def test_dashboard_shows_after_login(self, driver):
        """Dashboard should show DineOps branding after login"""
        # First ensure we're on dashboard (navigate there)
        driver.get(f"{BASE_URL}/dashboard")
        wait = WebDriverWait(driver, 10)

        # DineOps logo/title should be visible
        logo = wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(text(),'DineOps')]")
            )
        )
        assert logo.is_displayed()
