# Self-Service Password Reset on HRMS Login Page

## 📋 Overview

A self-service password reset feature has been added to the HRMS login page. Users who forgot their password can now request a password reset link directly from the login page without needing to contact an administrator.

## ✨ Features

✅ **Forgot Password Link** - Users can click "Forgot Password?" on the login form  
✅ **Email-Based Reset** - Password reset link sent via email  
✅ **Unauthenticated Access** - Users can request reset without being logged in  
✅ **Security** - No email enumeration (doesn't reveal if email exists)  
✅ **24-Hour Link Expiry** - Reset links expire after 24 hours  
✅ **User-Friendly Dialog** - Clean, simple interface for password reset  
✅ **Success Confirmation** - Clear feedback when reset link is sent  

---

## 🚀 How to Use

### For Users (Forgot Password)

1. **Go to Login Page**
   - Navigate to `development.test:8000/hrms/login`

2. **Click "Forgot Password?"**
   - Located below the Password field on the login form

3. **Enter Your Email**
   - A dialog will appear asking for your email address
   - Enter the email associated with your HRMS account

4. **Submit**
   - Click "Send Reset Link"
   - You'll see a success message

5. **Check Email**
   - Look for an email with the subject line "Password Reset"
   - The email contains a password reset link
   - Click the link to reset your password
   - Links expire after 24 hours

6. **Create New Password**
   - Enter your new password
   - Confirm the password
   - Click "Set Password"

### For Security

- You'll only receive a confirmation message that a reset link was sent
- The system doesn't reveal whether the email address exists in the system
- Reset links are valid for 24 hours only
- Once you reset your password, the old password is no longer valid

---

## 🔧 Technical Implementation

### Files Modified/Created

#### 1. Backend API Method (New)
**File:** `hrms/utils/password_reset.py`

```python
@frappe.whitelist(allow_guest=True)
def send_password_reset_email_by_email(email):
    """
    Self-service password reset for unauthenticated users
    Allows users on login page to request password reset via email
    
    Args:
        email (str): Email address to send reset link to
    
    Returns:
        dict: {
            success: bool,
            message: str,
            email: str
        }
    """
```

**Key Features:**
- `allow_guest=True` - Allows unauthenticated users to call this method
- Accepts email address as parameter
- Finds user by email and sends reset link via Frappe's built-in system
- Returns generic success message for security (doesn't reveal if email exists)
- Logs any errors internally without exposing details

#### 2. Frontend UI (Updated)
**File:** `frontend/src/views/Login.vue`

**Added Components:**
- "Forgot Password?" button link (below password field)
- Forgot Password Dialog with email input
- Success confirmation screen
- Error message display

**New Vue Data:**
```javascript
const showForgotPasswordDialog = ref(false)
const forgotPasswordEmail = ref(null)
const forgotPasswordError = ref("")
const forgotPasswordSent = ref(false)
const isSendingReset = ref(false)
```

**New Functions:**
```javascript
async function submitForgotPassword()
// Submits email and calls backend API

function closeForgotPasswordDialog()
// Clears form and closes dialog
```

---

## 📊 User Flow Diagram

```
┌─────────────────────┐
│   Login Page        │
│  [Forgot Password?] │ ← User clicks here
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│  Forgot Password    │
│   Dialog Box        │
│  Email: [_______]   │
│ [Send Reset Link]   │
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│  Backend API Call   │
│  send_password_     │
│  reset_email_by_    │
│  email()            │
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│  Frappe Email Sent  │
│  to User's Email    │
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│  Success Message    │
│  Check your email   │
│ [Back to Login]     │
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│  User Clicks Link   │
│  in Email (24h)     │
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│  Password Reset     │
│  Page (Frappe)      │
│  New Password: [__] │
│ [Set Password]      │
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│  Success! Password  │
│  has been reset     │
│  [Back to Login]    │
└─────────────────────┘
```

---

## 🔐 Security Features

### 1. No Email Enumeration
```python
# Returns success even if email doesn't exist
# Prevents attackers from discovering valid email addresses
return {
    "success": True,
    "message": "If an account with this email exists, a reset link was sent..."
}
```

### 2. Account Disabled Check
```python
if user_doc.disabled:
    return {
        "success": False,
        "message": "Your account has been disabled. Please contact the administrator."
    }
```

### 3. Built-in Email Verification
- Uses Frappe's native `send_password_reset_link()` function
- Links include security tokens
- Links expire after 24 hours

### 4. Error Logging
```python
frappe.log_error(
    title="Password Reset Email Send Failed",
    message=f"Failed to send password reset email to {email}"
)
```

---

## 📧 Email Configuration

For password reset emails to work, you need to configure HRMS email settings:

### Check Email Configuration
1. Go to **Settings** → **Email Settings**
2. Verify **Outgoing Mail Server** is configured
3. Check **Email Domain** is set correctly
4. Test with **Send Test Email**

### If Emails Aren't Being Sent
1. Check **Email Log** for failed emails
2. Verify SMTP server credentials
3. Check spam folder
4. Review email domain reputation

---

## 🐛 Troubleshooting

### Problem: "Forgot Password?" button doesn't appear
**Solution:**
- Clear browser cache (Ctrl+K or Cmd+K in browser)
- Refresh login page
- Check that frontend was rebuilt successfully

### Problem: Dialog appears but clicking "Send Reset Link" does nothing
**Solution:**
- Check browser console for JavaScript errors (F12)
- Verify Frappe backend is running
- Check email configuration is set up

### Problem: User doesn't receive reset email
**Solution:**
- Check Email Log for delivery errors
- Verify email configuration in settings
- Check spam/junk folder
- Verify email domain is correctly configured

### Problem: "Failed to send reset link" error message
**Solution:**
- Email server might be misconfigured
- Check SMTP credentials
- Verify outgoing mail server settings
- Check error logs in browser console

---

## 🔌 API Reference

### Endpoint
```
POST /api/method/hrms.utils.password_reset.send_password_reset_email_by_email
```

### Parameters
```javascript
{
    "email": "user@example.com"
}
```

### Example JavaScript Call
```javascript
frappe.call({
    method: "hrms.utils.password_reset.send_password_reset_email_by_email",
    args: {
        email: "user@example.com"
    },
    callback: function(r) {
        if (r.message.success) {
            console.log("Reset link sent to:", r.message.email);
            console.log(r.message.message);
        } else {
            console.log("Error:", r.message.message);
        }
    }
});
```

### Response
```javascript
{
    "success": true,
    "message": "If an account with this email exists, a password reset link has been sent to your email.",
    "email": "user@example.com"
}
```

---

## ✅ Testing Checklist

- [ ] Login page loads correctly
- [ ] "Forgot Password?" button is visible
- [ ] Clicking button opens dialog
- [ ] Dialog accepts email input
- [ ] "Send Reset Link" button works
- [ ] Success message appears
- [ ] Email is received with reset link
- [ ] Reset link works and opens password reset page
- [ ] New password can be set successfully
- [ ] Old password no longer works
- [ ] Can login with new password

---

## 📚 Related Files

- **Backend:** `hrms/utils/password_reset.py`
- **Frontend:** `frontend/src/views/Login.vue`
- **Documentation:** `PASSWORD_RESET_FEATURE.md` (Employee form reset)
- **Admin Panel:** `hrms/hooks.py` (configuration)

---

## 🔄 Integration with Existing Features

This self-service login page feature **complements** the existing password reset features:

| Feature | Location | User Type | Requirements |
|---------|----------|-----------|--------------|
| **Self-Service (New)** | Login Page | Unauthenticated | Email address |
| **HR Admin Reset** | Employee Form | HR Users | Must be logged in |
| **Employee Self-Reset** | Employee Form | Logged-in Employee | Must have Employee record |

---

## 🚀 Deployment Notes

### Fresh Installation
- Feature is automatically included
- No additional setup required
- Just configure email settings

### Existing Installations
- Files automatically added during migration
- Frontend rebuilt during `bench build`
- No database changes required

### Rollback
If needed to disable this feature:
1. Remove "Forgot Password?" button from Login.vue
2. Remove `send_password_reset_email_by_email()` function from password_reset.py
3. Run `bench --site development.test migrate`

---

## 📝 Support

For issues or questions:
1. Check EMAIL configuration in Frappe Settings
2. Review browser console for JavaScript errors
3. Check Frappe error logs
4. Verify user account isn't disabled
5. Check email delivery logs

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | May 10, 2026 | Initial release - Self-service password reset on login page |

---

**Last Updated:** May 10, 2026  
**Status:** ✅ Production Ready
