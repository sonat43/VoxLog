import pytest
import time
import random
import string
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# --- CONFIGURATION ---
BASE_URL = "http://localhost:5173"
ADMIN_EMAIL = "sonatjoseph13@gmail.com"
ADMIN_PASSWORD = "sonat@123"
WAIT_TIMEOUT = 30

def generate_random_email():
    """Generates a random email to ensure uniqueness."""
    chars = string.ascii_lowercase + string.digits
    random_str = ''.join(random.choice(chars) for _ in range(8))
    return f"test_faculty_{random_str}@example.com"

class TestRegistration:
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

    def test_admin_provision_user(self):
        # 1. Login as Admin
        self.driver.get(f"{BASE_URL}/")
        self.wait.until(EC.presence_of_element_located((By.ID, "email"))).send_keys(ADMIN_EMAIL)
        self.driver.find_element(By.ID, "password").send_keys(ADMIN_PASSWORD)
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        
        # 2. Navigate to User Management
        self.wait.until(EC.url_contains("/admin-dashboard"))
        self.driver.get(f"{BASE_URL}/admin-dashboard/users")
        
        # 3. Open Provision Modal
        add_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Add New')]")))
        self.driver.execute_script("arguments[0].click();", add_btn)

        # 4. Fill Account Tab (Initial tab)
        faculty_email = generate_random_email()
        self.wait.until(EC.visibility_of_element_located((By.NAME, "displayName"))).send_keys("Test Faculty User")
        self.driver.find_element(By.NAME, "email").send_keys(faculty_email)
        # Role and Status have defaults, but let's be explicit if needed
        
        # 5. Switch to Identity Tab
        identity_tab = self.driver.find_element(By.XPATH, "//button[contains(., 'Identity')]")
        identity_tab.click()
        time.sleep(0.5) # Wait for tab switch
        
        self.driver.find_element(By.NAME, "gender").send_keys("Male")
        dob_field = self.driver.find_element(By.NAME, "dateOfBirth")
        self.set_value_and_trigger_change(dob_field, "1990-01-01")
        self.driver.find_element(By.NAME, "nationality").send_keys("Indian")
        self.driver.find_element(By.NAME, "maritalStatus").send_keys("Single")

        # 6. Switch to Professional Tab
        prof_tab = self.driver.find_element(By.XPATH, "//button[contains(., 'Professional')]")
        prof_tab.click()
        time.sleep(0.5)
        
        # Department select - might need to wait for data
        dept_select = self.wait.until(EC.presence_of_element_located((By.NAME, "department")))
        # We'll just pick the first non-empty option or send a known name if it exists
        # For tests, sending keys to select usually works if the option exists
        dept_select.send_keys("Computer Science") 
        
        self.driver.find_element(By.NAME, "designation").send_keys("Assistant Professor")
        self.driver.find_element(By.NAME, "employeeId").send_keys(f"EMP{random.randint(1000, 9999)}")
        joining_field = self.driver.find_element(By.NAME, "joiningDate")
        self.set_value_and_trigger_change(joining_field, "2024-01-01")
        self.driver.find_element(By.NAME, "specialization").send_keys("Software Engineering")
        self.driver.find_element(By.NAME, "qualifications").send_keys("M.Tech, PhD")
        self.driver.find_element(By.NAME, "experience").send_keys("5 years")

        # 7. Switch to Contact Tab
        contact_tab = self.driver.find_element(By.XPATH, "//button[contains(., 'Contact')]")
        contact_tab.click()
        time.sleep(0.5)
        
        self.driver.find_element(By.NAME, "phone").send_keys("9876543210")
        self.driver.find_element(By.NAME, "address").send_keys("123 Test Street")
        self.driver.find_element(By.NAME, "city").send_keys("Kottayam")
        self.driver.find_element(By.NAME, "state").send_keys("Kerala")
        self.driver.find_element(By.NAME, "zipCode").send_keys("686512")
        
        # Emergency Contact
        self.driver.find_element(By.NAME, "emergencyContactName").send_keys("Emergency Contact")
        self.driver.find_element(By.NAME, "emergencyContactRelation").send_keys("Relative")
        self.driver.find_element(By.NAME, "emergencyContactPhone").send_keys("9123456789")

        # 8. Submit
        submit_btn = self.driver.find_element(By.XPATH, "//button[contains(., 'Provision User')]")
        self.driver.execute_script("arguments[0].click();", submit_btn)

        # 9. Verification
        self.wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Success') or contains(text(), 'created')]")))
        print(f"\n[SUCCESS] User {faculty_email} provisioned successfully")

if __name__ == "__main__":
    pytest.main([__file__])
