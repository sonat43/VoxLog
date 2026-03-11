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
WAIT_TIMEOUT = 30

class TestLeaveApply:
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

    def test_faculty_apply_leave(self):
        # 1. Login
        self.driver.get(f"{BASE_URL}/")
        self.wait.until(EC.presence_of_element_located((By.ID, "email"))).send_keys(FACULTY_EMAIL)
        self.driver.find_element(By.ID, "password").send_keys(FACULTY_PASSWORD)
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        
        # 2. Navigate to Leave Management
        self.wait.until(EC.url_contains("/faculty/dashboard"))
        self.driver.get(f"{BASE_URL}/faculty/leave-management")
        
        # 3. Clear History (Cleanup)
        try:
            clear_btn = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[title='Delete Copy']")))
            self.driver.execute_script("arguments[0].click();", clear_btn)
            self.wait.until(EC.alert_is_present())
            self.driver.switch_to.alert.accept()
            time.sleep(2)
        except:
            pass

        # 4. Open Apply Modal
        apply_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Apply for Leave')]")))
        self.driver.execute_script("arguments[0].click();", apply_btn)

        # 5. Fill Form
        self.wait.until(EC.visibility_of_element_located((By.XPATH, "//h2[contains(., 'Apply for Leave')]")))
        time.sleep(1) # Animation buffer

        # Type
        type_sel = self.driver.find_element(By.XPATH, "//label[contains(., 'Type')]/..//select")
        type_sel.send_keys("Sick Leave")
        
        # Dates (Dec 1-2, 2026 - Tue/Wed)
        from_field = self.driver.find_element(By.XPATH, "//label[contains(., 'From')]/..//input")
        self.set_value_and_trigger_change(from_field, "2026-12-01")
        
        to_field = self.driver.find_element(By.XPATH, "//label[contains(., 'To')]/..//input")
        self.set_value_and_trigger_change(to_field, "2026-12-02")

        # Reason
        reason_field = self.driver.find_element(By.XPATH, "//label[contains(., 'Reason')]/..//textarea")
        reason_field.send_keys("Automated test submission.")

        # 6. Submit
        submit_btn = self.driver.find_element(By.XPATH, "//button[contains(., 'Submit Request')]")
        self.driver.execute_script("arguments[0].click();", submit_btn)

        # 7. Verification - Wait for toast or modal to disappear
        self.wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'submitted') or contains(text(), 'success')]")))
        print("\n[SUCCESS] Faculty Leave Applied Successfully")

if __name__ == "__main__":
    pytest.main([__file__])
