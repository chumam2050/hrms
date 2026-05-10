"""
Password Reset Utility for HRMS
Provides methods to reset employee passwords
"""

import secrets
import string

import frappe
from frappe import _, throw
from frappe.core.doctype.user.user import test_password_strength
from frappe.utils import cint
from frappe.utils.password import update_password


@frappe.whitelist()
def reset_employee_password(employee_id, new_password=None):
    """
    Reset password for an employee
    
    Args:
        employee_id (str): Employee ID (docname)
        new_password (str, optional): New password. If not provided, generates a random one
    
    Returns:
        dict: Contains success status and message
    """
    # Validate employee exists
    if not frappe.db.exists("Employee", employee_id):
        throw(_("Employee {} does not exist").format(employee_id))
    
    employee = frappe.get_doc("Employee", employee_id)
    
    # Get user linked to employee
    user_id = employee.user_id if hasattr(employee, 'user_id') else None
    
    if not user_id or not frappe.db.exists("User", user_id):
        throw(_("No User linked to Employee {}. Cannot reset password.").format(employee_id))
    
    # Check permission - only HR users or self can reset
    current_user = frappe.session.user
    if current_user != user_id and not frappe.has_role("HR User"):
        throw(_("You do not have permission to reset this employee's password"))
    
    # Generate password if not provided
    if not new_password:
        chars = string.ascii_letters + string.digits + "!@#$%^&*"
        new_password = "".join(secrets.choice(chars) for _ in range(12))
    
    # Validate password strength
    strength_result = test_password_strength(new_password)
    strength_score = cint((strength_result or {}).get("score") or 5)
    if strength_score < 2:  # Frappe default: at least 2 out of 5
        throw(_("Password is too weak. Please use a stronger password."))
    
    # Update user password
    update_password(user=user_id, pwd=new_password, logout_all_sessions=True)
    
    # Log the action
    frappe.log_error(
        title="Employee Password Reset",
        message=f"Password reset for employee {employee_id} (User: {user_id}) by {current_user}",
        reference_doctype="Employee",
        reference_name=employee_id
    )
    
    return {
        "success": True,
        "message": _("Password has been reset successfully"),
        "password": new_password if current_user == user_id else None,  # Only show to self
        "user_id": user_id
    }


@frappe.whitelist()
def request_password_reset(employee_id):
    """
    Send password reset email to employee
    
    Args:
        employee_id (str): Employee ID
    
    Returns:
        dict: Contains success status
    """
    if not frappe.db.exists("Employee", employee_id):
        throw(_("Employee {} does not exist").format(employee_id))
    
    employee = frappe.get_doc("Employee", employee_id)
    user_id = employee.user_id if hasattr(employee, 'user_id') else None
    
    if not user_id or not frappe.db.exists("User", user_id):
        throw(_("No User linked to Employee {}").format(employee_id))
    
    # Check permission
    if not (frappe.has_role("HR User") or frappe.session.user == user_id):
        throw(_("You do not have permission to request password reset for this employee"))
    
    # Send password reset email
    try:
        user = frappe.get_doc("User", user_id)
        user.validate_reset_password()
        user._reset_password(send_email=True)
        
        return {
            "success": True,
            "message": _("Password reset link has been sent to {0}").format(user.email)
        }
    except Exception as e:
        throw(_("Failed to send password reset email: {0}").format(str(e)))


@frappe.whitelist()
def validate_password_strength(password):
    """
    Validate password strength
    
    Args:
        password (str): Password to validate
    
    Returns:
        dict: Contains strength score and feedback
    """
    strength_result = test_password_strength(password)
    strength_score = cint((strength_result or {}).get("score") or 5)
    
    feedback = {
        0: _("Very Weak"),
        1: _("Weak"),
        2: _("Fair"),
        3: _("Good"),
        4: _("Strong"),
        5: _("Very Strong")
    }
    
    return {
        "score": strength_score,
        "feedback": feedback.get(strength_score, _("Unknown")),
        "passed": strength_score >= 2
    }


@frappe.whitelist(allow_guest=True)
def send_password_reset_email_by_email(email):
    """
    Self-service password reset for login page
    Allows unauthenticated users to request password reset via email
    
    Args:
        email (str): Email address to send reset link to
    
    Returns:
        dict: Contains success status and message
    """
    if not email or not isinstance(email, str):
        throw(_("Valid email address required"))
    
    email = email.strip().lower()
    
    # Find user candidates by email.
    # Use deterministic selection to avoid accidentally picking Administrator
    # when multiple users share the same email.
    users = frappe.get_all(
        "User",
        filters={"email": email},
        fields=["name", "email", "enabled", "first_name", "last_name"],
        limit_page_length=20,
        order_by="name asc",
    )

    user = None
    if users:
        # 1) Prefer account where login id (name) equals email (common real user account).
        user = next((u for u in users if (u.get("name") or "").lower() == email), None)
        # 2) Otherwise prefer enabled non-Administrator user.
        if not user:
            user = next((u for u in users if u.get("enabled") and u.get("name") != "Administrator"), None)
        # 3) Fallback to any enabled user.
        if not user:
            user = next((u for u in users if u.get("enabled")), None)
        # 4) Last fallback to first match.
        if not user:
            user = users[0]
    
    if not user:
        # For security: don't reveal if email exists or not
        # Just return success message
        return {
            "success": True,
            "message": _("If an account with this email exists, a password reset link has been sent to your email."),
            "email": email
        }
    
    # Check if user is active
    if not user.get("enabled"):
        return {
            "success": False,
            "message": _("Your account has been disabled. Please contact the administrator.")
        }
    
    try:
        # Generate reset password key
        from frappe.utils import get_url
        from frappe.utils.data import sha256_hash
        from frappe.utils import now_datetime
        
        user_doc = frappe.get_doc("User", user.name)
        user_doc.validate_reset_password()
        
        # Generate password reset key (same as _reset_password does)
        key = frappe.generate_hash()
        hashed_key = sha256_hash(key)
        user_doc.db_set("reset_password_key", hashed_key)
        user_doc.db_set("last_reset_password_key_generated_on", now_datetime())
        
        # Build reset link
        reset_url = get_url("/update-password?key=" + key, allow_header_override=False)
        
        # Prepare email content
        fullname = (user.first_name or user.last_name or user.name)
        reset_password_template = frappe.db.get_system_setting("reset_password_template")
        
        # Build template arguments
        template_args = {
            "first_name": fullname,
            "user": user.name,
            "title": _("Password Reset"),
            "login_url": get_url(),
            "link": reset_url,
        }
        
        # Get template content
        if reset_password_template:
            try:
                from frappe.email.doctype.email_template.email_template import get_email_template
                email_template_doc = get_email_template(reset_password_template, template_args)
                subject = email_template_doc.get("subject")
                content = email_template_doc.get("message")
            except Exception:
                # Fallback if template fails
                subject = _("Password Reset Request")
                content = f"<p>Dear {fullname},</p><p>Click here to reset your password: <a href='{reset_url}'>Reset Password</a></p>"
        else:
            # No template configured, use simple fallback
            subject = _("Password Reset Request")
            content = f"<p>Dear {fullname},</p><p>Click here to reset your password: <a href='{reset_url}'>Reset Password</a></p>"
        
        # Create Email Queue entry directly to ensure email is queued.
        # Build a valid RFC822-like message so Email Queue can send it correctly.
        from frappe.email.doctype.email_queue.email_queue import EmailQueue
        
        mime_message = (
            f"Subject: {subject}\n"
            "MIME-Version: 1.0\n"
            "Content-Type: text/html; charset=UTF-8\n\n"
            f"{content}"
        )

        default_sender_email = frappe.db.get_value(
            "Email Account",
            {"default_outgoing": 1, "enable_outgoing": 1},
            "email_id",
        )

        email_queue_data = {
            "recipients": [user.email],
            "sender": default_sender_email or user.email,
            "subject": subject,
            "message": mime_message,
            "status": "Not Sent",
            "priority": 1,
            "unsubscribe_params": None,
            "add_unsubscribe_link": 0,  # Don't add unsubscribe for password reset
        }
        
        email_queue = EmailQueue.new(email_queue_data, ignore_permissions=True)

        # In development, background workers may not always be running.
        # Try sending immediately after queue creation so reset emails still arrive.
        if email_queue:
            try:
                email_queue.send(force_send=True)
            except Exception:
                # Keep API response generic for security; just log technical details.
                frappe.log_error(
                    title="Password Reset Email Queue Send Failed",
                    message=f"Failed to send queued password reset email for user {user.name} ({email}). Queue: {email_queue.name}",
                )
        
        return {
            "success": True,
            "message": _("If an account with this email exists, a password reset link has been sent to your email."),
            "email": email
        }
    except Exception as e:
        # Log error but don't expose details to user
        import traceback
        error_trace = traceback.format_exc()
        
        try:
            frappe.log_error(
                title="Password Reset Email Send Failed",
                message=f"Failed to send password reset email to {email}: {str(e)}\n\nTraceback:\n{error_trace}"
            )
        except:
            pass  # Ignore logging errors
        
        # Still return success to avoid revealing if email exists
        return {
            "success": True,
            "message": _("If an account with this email exists, a password reset link has been sent to your email."),
            "email": email
        }
