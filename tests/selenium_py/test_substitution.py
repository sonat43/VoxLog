import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# --- CONFIGURATION ---
BASE_URL = "http://localhost:5173"
FACULTY_EMAIL = "sonatjoseph2028@mca.ajce.in"
FACULTY_PASSWORD = "sonat@123"
# The date should match a date where the faculty has an approved leave
# In test_leave_apply.py, we used 2026-12-01
SUBSTITUTION_DATE = "2026-12-01" 
WAIT_TIMEOUT = 30

class TestSubstitution:
    def setup_method(self):
        self.driver = webdriver.Chrome()
        self.wait = WebDriverWait(self.driver, WAIT_TIMEOUT)

    def teardown_method(self):
        self.driver.quit()

    def set_value_and_trigger_change(self, element, value):
        """Sets an input value and triggers React-compatible events."""
        self.driver.execute_script(
            "arguments[0].value = arguments[1]; "
            "arguments[0].dispatchEvent(new Event('input', { bubbles: true })); "
            "arguments[0].dispatchEvent(new Event('change', { bubbles: true }));",
            element, value
        )

    def test_faculty_assign_substitution(self):
        # 1. Login as Faculty
        self.driver.get(f"{BASE_URL}/")
        self.wait.until(EC.presence_of_element_located((By.ID, "email"))).send_keys(FACULTY_EMAIL)
        self.driver.find_element(By.ID, "password").send_keys(FACULTY_PASSWORD)
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        
        # 2. Navigate to Substitutions
        self.wait.until(EC.url_contains("/faculty/dashboard"))
        # Using the direct URL or finding the link
        self.driver.get(f"{BASE_URL}/faculty/substitutions")
        
        # 3. Select Date
        # The date input has no name but it's the only one of type date here
        date_input = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='date']")))
        self.set_value_and_trigger_change(date_input, SUBSTITUTION_DATE)
        
        # Click refresh to be sure
        refresh_btn = self.driver.find_element(By.CSS_SELECTOR, "button[title='Refresh']")
        refresh_btn.click()
        time.sleep(2) # Wait for network/loading

        # 4. Select a Class Needing Coverage
        # They are rendered as divs with cursor: pointer. 
        # We look for one that has "Pending" status badge.
        try:
            pending_classes = self.driver.find_elements(By.XPATH, "//div[contains(., 'Pending') and contains(@style, 'cursor: pointer')]")
            if not pending_classes:
                pytest.skip(f"No pending classes found for {SUBSTITUTION_DATE}. Ensure a leave is approved for this date.")
            
            # Click the first one
            self.driver.execute_script("arguments[0].click();", pending_classes[0])
            time.sleep(1) # Wait for panel to update

            # 5. Select an Available Substitute
            # They are buttons in the right column
            substitutes = self.driver.find_elements(By.XPATH, "//button[contains(., 'Available')]")
            if not substitutes:
                 pytest.fail("No available substitutes found.")
            
            # Click the first available substitute
            self.driver.execute_script("arguments[0].click();", substitutes[0])
            time.sleep(1)

            # 6. Confirm Assignment
            confirm_btn = self.driver.find_element(By.XPATH, "//button[contains(., 'Assign Substitute')]")
            self.driver.execute_script("arguments[0].click();", confirm_btn)

            # 7. Verification
            self.wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'confirmed') or contains(text(), 'notified') or contains(text(), 'Success')]")))
            print(f"\n[SUCCESS] Substitution assigned for {SUBSTITUTION_DATE}")

        except Exception as e:
            if "No pending classes" in str(e):
                print(f"\n[INFO] {e}")
            else:
                raise e

if __name__ == "__main__":
    pytest.main([__file__])
