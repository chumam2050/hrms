# HRMS Password Reset Feature

## Overview

This feature adds secure password reset functionality to the HRMS Employee module. It allows HR administrators to reset employee passwords and employees to request their own password resets.

## Features

### 1. **Admin Password Reset** (HR Users Only)
- HR administrators can directly reset employee passwords
- Supports manual password entry or auto-generated strong passwords
- Real-time password strength validation
- All password resets are logged for audit purposes

### 2. **Email-Based Password Reset**
- Employees can request a password reset link via email
- HR administrators can send password reset emails to employees
- Uses Frappe's built-in password reset email mechanism

### 3. **Employee Self-Service**
- Employees can request their own password reset
- Safe and secure process that doesn't expose passwords

### 4. **Password Strength Validation**
- Real-time password strength scoring (0-5 scale)
- Minimum strength requirement enforced
- Visual feedback during password entry

## Usage

### For HR Administrators

1. **Reset Employee Password (Direct)**:
   - Open Employee record
   - Click "Reset Password" button
   - Choose: Enter new password or generate random password
   - Click "Reset Password" to confirm
   - New password will be displayed (copy and securely share)

2. **Send Password Reset Email**:
   - Open Employee record
   - Click "Password" dropdown → "Send Password Reset Email"
   - Employee receives email with reset link

### For Employees

1. **Request Your Password Reset**:
   - Open your Employee record
   - Click "Password" dropdown → "Request Password Reset"
   - Check your email for password reset link
   - Follow link to create new password

## Architecture

### Files Added/Modified

#### 1. **hrms/utils/password_reset.py** (New)
Core password reset logic with following methods:
- `reset_employee_password()` - Direct password reset
- `request_password_reset()` - Send password reset email
- `validate_password_strength()` - Check password strength

#### 2. **hrms/public/js/employee_password_reset.js** (New)
Frontend UI components:
- Password reset dialog with strength meter
- Email confirmation dialogs
- Real-time password validation

#### 3. **hrms/hr/overrides/employee_override.py** (New)
Helper functions for Employee doctype integration

#### 4. **hrms/hooks.py** (Modified)
Added JavaScript file to Employee form

## Permissions & Security

### Permission Requirements

| Action | Required Permission | Notes |
|--------|-------------------|-------|
| Reset any employee password | HR User role | Requires HR User role |
| Send password reset email | HR User role | Requires HR User role |
| Request own password reset | Employee (self) | Can request on own record |
| View password reset history | HR Manager | Logged in error log |

### Security Features

1. **Permission Checks**: Only authorized users can perform actions
2. **Audit Logging**: All password resets logged with timestamp and user
3. **Password Strength**: Enforces minimum password complexity
4. **Email Verification**: Reset links sent via email to registered email only
5. **Session-based**: Uses Frappe session management

## Configuration

### Default Password Settings

- **Auto-Generated Password Length**: 12 characters
- **Minimum Strength Score**: 2 out of 5
- **Password Expiry**: Follows your Frappe/ERPNext settings

### Customization

To customize password requirements, edit `hrms/utils/password_reset.py`:

```python
# Adjust minimum strength score (0-5)
if strength_score < 2:  # Change this value
    throw(_("Password is too weak"))

# Change auto-generated password length
new_password = generate_password(length=12)  # Change length
```

## API Methods

### reset_employee_password
```python
frappe.call({
    method: "hrms.utils.password_reset.reset_employee_password",
    args: {
        employee_id: "EMP-001",
        new_password: "MySecure@123"  # Optional, auto-generates if not provided
    },
    callback: function(r) {
        console.log(r.message.success);  // true/false
        console.log(r.message.message);  // Success message
    }
})
```

### request_password_reset
```python
frappe.call({
    method: "hrms.utils.password_reset.request_password_reset",
    args: { employee_id: "EMP-001" },
    callback: function(r) {
        console.log(r.message.message);  // Confirmation message
    }
})
```

### validate_password_strength
```python
frappe.call({
    method: "hrms.utils.password_reset.validate_password_strength",
    args: { password: "Test@123456" },
    callback: function(r) {
        console.log(r.message.score);      // 0-5
        console.log(r.message.feedback);   // "Good", "Strong", etc
        console.log(r.message.passed);     // true/false
    }
})
```

## Troubleshooting

### Button Not Showing
- Verify user has "HR User" role
- Check that Employee record has `user_id` field filled
- Clear browser cache and refresh

### Password Reset Not Working
- Verify Employee has linked User record
- Check Frappe email settings are configured
- Check browser console for JavaScript errors
- Verify user permissions in Developer Tools

### Email Not Received
- Check email configuration in Frappe Settings
- Verify recipient email address in User record
- Check spam/junk folder
- Review System Settings → Email Domain

## Testing

Run tests with:
```bash
cd /workspace/development/frappe-bench
bench --site development.test run-tests --module hrms
```

## Future Enhancements

- [ ] Bulk password reset for multiple employees
- [ ] Password reset via SMS
- [ ] Password expiry notifications
- [ ] Two-factor authentication integration
- [ ] Password history tracking
- [ ] Custom password policies per department

## Support & Contribution

For issues, questions, or contributions, please refer to the main HRMS repository.

---

**Last Updated**: May 10, 2026
**Version**: 1.0.0
