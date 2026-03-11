import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import sys

# --- CONFIGURATION (Self-Contained) ---
BASE_URL = "http://localhost:5173"
ADMIN_EMAIL = "sonatjoseph13@gmail.com"
ADMIN_PASSWORD = "sonat@123"
FACULTY_EMAIL = "sonatjoseph2028@mca.ajce.in"
FACULTY_PASSWORD = "sonat@123"
WAIT_TIMEOUT = 20  # Increased timeout

class TestLogin:
    def setup_method(self):
        options = webdriver.ChromeOptions()
        # options.add_argument('--headless') 
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, WAIT_TIMEOUT)

    def teardown_method(self):
        self.driver.quit()

    def test_admin_login(self):
        self.driver.get(f"{BASE_URL}/")
        
        email_field = self.wait.until(EC.presence_of_element_located((By.ID, "email")))
        email_field.send_keys(ADMIN_EMAIL)
        self.driver.find_element(By.ID, "password").send_keys(ADMIN_PASSWORD)
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        # Check redirection to admin dashboard
        self.wait.until(EC.url_contains("/admin-dashboard"))
        assert "/admin-dashboard" in self.driver.current_url
        print("\n[SUCCESS] Admin Login Verified")

    def test_faculty_login(self):
        self.driver.get(f"{BASE_URL}/")
        
        email_field = self.wait.until(EC.presence_of_element_located((By.ID, "email")))
        email_field.send_keys(FACULTY_EMAIL)
        self.driver.find_element(By.ID, "password").send_keys(FACULTY_PASSWORD)
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        # Wait for the final redirected URL
        # The app redirects /faculty-dashboard -> /faculty/dashboard
        self.wait.until(EC.url_contains("/faculty/dashboard"))
        assert "/faculty/dashboard" in self.driver.current_url
        print("\n[SUCCESS] Faculty Login Verified")

if __name__ == "__main__":
    pytest.main([__file__])
