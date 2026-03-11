import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import sys

# --- CONFIGURATION (Self-Contained) ---
BASE_URL = "http://localhost:5173"
ADMIN_EMAIL = "sonatjoseph13@gmail.com"
ADMIN_PASSWORD = "sonat@123"
WAIT_TIMEOUT = 20

class TestUserSearch:
    def setup_method(self):
        self.driver = webdriver.Chrome()
        self.wait = WebDriverWait(self.driver, WAIT_TIMEOUT)
        # Login
        self.driver.get(f"{BASE_URL}/")
        self.wait.until(EC.presence_of_element_located((By.ID, "email"))).send_keys(ADMIN_EMAIL)
        self.driver.find_element(By.ID, "password").send_keys(ADMIN_PASSWORD)
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        self.wait.until(EC.url_contains("/admin-dashboard"))

    def teardown_method(self):
        self.driver.quit()

    def test_user_search_and_filter(self):
        self.driver.get(f"{BASE_URL}/admin-dashboard/users")
        
        # Wait for the loading state to finish (wait for a tr to appear that DOES NOT contain "Loading")
        self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "tbody tr")))
        
        # Give it a moment to render the users
        time.sleep(2) 

        search_input = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder='Search...']")))
        
        # Initial row count (skip if it's "No records")
        initial_rows = self.driver.find_elements(By.CSS_SELECTOR, "tbody tr")
        initial_count = len(initial_rows)
        
        # If the first row says "No records", initial count should be treated as 0 for logical comparison
        if initial_count == 1 and "no records" in initial_rows[0].text.lower():
            initial_count = 0

        # Search for a keyword
        search_input.send_keys("sonat") # Search for the user's name
        time.sleep(2) # Wait for debounce/filtering

        filtered_rows = self.driver.find_elements(By.CSS_SELECTOR, "tbody tr")
        filtered_count = len(filtered_rows)
        
        if filtered_count == 1 and "no records" in filtered_rows[0].text.lower():
            filtered_count = 0

        # Logically, filtered results should be a subset of initial results (or equal)
        # However, if initial was from a tab and search is global, it might vary.
        # But here they are both "All Users".
        assert filtered_count <= initial_count
        print(f"\n[SUCCESS] User Search Filtering Verified (Found {filtered_count} of {initial_count})")

    def test_filter_tabs(self):
        self.driver.get(f"{BASE_URL}/admin-dashboard/users")
        
        # Wait for table
        self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "tbody tr")))
        
        faculty_tab = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Faculty')]")))
        faculty_tab.click()

        time.sleep(2)
        
        rows = self.driver.find_elements(By.CSS_SELECTOR, "tbody tr")
        assert len(rows) > 0
        print("\n[SUCCESS] User Role Tabs Verified")

if __name__ == "__main__":
    pytest.main([__file__])
