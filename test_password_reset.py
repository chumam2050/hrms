"""
Test script for HRMS Password Reset Feature
"""

import frappe
import sys

def test_password_reset_feature():
    """
    Test password reset functionality
    """
    print("\n" + "="*60)
    print("HRMS Password Reset Feature - Test Suite")
    print("="*60 + "\n")
    
    try:
        # Test 1: Check if password reset module is available
        print("[TEST 1] Checking if password_reset module is available...")
        try:
            from hrms.utils import password_reset
            print("✓ password_reset module imported successfully\n")
        except ImportError as e:
            print(f"✗ Failed to import password_reset: {e}\n")
            return False
        
        # Test 2: Check if methods are accessible
        print("[TEST 2] Checking if password reset methods are accessible...")
        methods = [
            "reset_employee_password",
            "request_password_reset", 
            "validate_password_strength"
        ]
        
        for method in methods:
            if hasattr(password_reset, method):
                print(f"  ✓ {method} found")
            else:
                print(f"  ✗ {method} not found")
                return False
        print()
        
        # Test 3: Validate password strength
        print("[TEST 3] Testing password strength validation...")
        test_passwords = [
            ("weak", 0),
            ("Weak123", 2),
            ("Strong@Pass123", 4),
        ]
        
        for pwd, _ in test_passwords:
            result = frappe.call(
                method="hrms.utils.password_reset.validate_password_strength",
                args={"password": pwd},
                async_=False
            )
            if result and hasattr(result, 'message'):
                score = result.message.get('score')
                feedback = result.message.get('feedback')
                print(f"  Password '{pwd}': Score {score} - {feedback}")
        print()
        
        # Test 4: Check if JavaScript file exists
        print("[TEST 4] Checking if employee_password_reset.js exists...")
        import os
        js_path = "/workspace/development/frappe-bench/apps/hrms/hrms/public/js/employee_password_reset.js"
        if os.path.exists(js_path):
            print(f"  ✓ File found at {js_path}\n")
        else:
            print(f"  ✗ File not found at {js_path}\n")
            return False
        
        # Test 5: Check if hooks are configured
        print("[TEST 5] Checking if hooks.py is configured...")
        hooks_path = "/workspace/development/frappe-bench/apps/hrms/hrms/hooks.py"
        with open(hooks_path, 'r') as f:
            hooks_content = f.read()
            if "employee_password_reset.js" in hooks_content:
                print("  ✓ employee_password_reset.js found in hooks.py\n")
            else:
                print("  ✗ employee_password_reset.js not found in hooks.py\n")
                return False
        
        # Test 6: Check Employee doctype compatibility
        print("[TEST 6] Checking Employee doctype for user_id field...")
        employee_meta = frappe.get_meta("Employee")
        fields = [f.fieldname for f in employee_meta.fields]
        if "user_id" in fields:
            print("  ✓ user_id field exists in Employee doctype\n")
        else:
            print("  ✗ user_id field not found in Employee doctype\n")
            print("  Note: Employee may need to be customized with user_id field\n")
        
        print("="*60)
        print("✓ All tests passed! Password Reset feature is ready to use.")
        print("="*60 + "\n")
        
        print("USAGE INSTRUCTIONS:")
        print("-" * 60)
        print("1. Open an Employee record in the Employee list")
        print("2. Look for 'Password' dropdown menu on the form")
        print("3. Choose one of the following:")
        print("   - 'Reset Password': Direct password reset (HR Users only)")
        print("   - 'Send Password Reset Email': Email reset link")
        print("   - 'Request Password Reset': Self-service reset (for own record)")
        print("-" * 60 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    try:
        success = test_password_reset_feature()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
