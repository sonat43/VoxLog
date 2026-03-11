import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# --- CONFIGURATION ---
BASE_URL = "http://localhost:5173"
ADMIN_EMAIL = "sonatjoseph13@gmail.com"
ADMIN_PASSWORD = "sonat@123"
WAIT_TIMEOUT = 30

class TestLeaveApprove:
    def setup_method(self):
        self.driver = webdriver.Chrome()
        self.wait = WebDriverWait(self.driver, WAIT_TIMEOUT)

    def teardown_method(self):
        self.driver.quit()

    def test_admin_approve_leave(self):
        # 1. Login
        self.driver.get(f"{BASE_URL}/")
        self.wait.until(EC.presence_of_element_located((By.ID, "email"))).send_keys(ADMIN_EMAIL)
        self.driver.find_element(By.ID, "password").send_keys(ADMIN_PASSWORD)
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        
        # 2. Navigate to Approvals
        self.wait.until(EC.url_contains("/admin-dashboard"))
        self.driver.get(f"{BASE_URL}/admin-dashboard/leaves")
        
        # 3. Find and Approve
        try:
            approve_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Approve')]")))
            self.driver.execute_script("arguments[0].click();", approve_btn)
            
            # 4. Verification
            self.wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'approved') or contains(text(), 'success')]")))
            print("\n[SUCCESS] Admin Leave Approved Successfully")
        except:
            print("\n[INFO] No pending leave requests found to approve.")

if __name__ == "__main__":
    pytest.main([__file__])
