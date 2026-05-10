"""
Override Employee Doctype to add password reset functionality
"""

from frappe import _


def add_password_reset_button(doc, method):
    """
    Add password reset button to Employee form if user has permission
    
    This is called on form_load hook
    """
    import frappe
    
    # Only show button if user is HR User or if looking at their own employee record
    if not (frappe.has_role("HR User") or doc.user_id == frappe.session.user):
        return
    
    # Add custom button via client-side method
    pass


def get_employee_reset_actions(doc):
    """
    Get available password reset actions for an employee
    """
    import frappe
    
    actions = []
    
    # Check if employee has linked user
    if doc.user_id and frappe.db.exists("User", doc.user_id):
        # HR users can reset password
        if frappe.has_role("HR User"):
            actions.append({
                "label": _("Reset Password"),
                "action": "reset_password_for_employee",
                "permission": True
            })
            actions.append({
                "label": _("Send Password Reset Email"),
                "action": "send_password_reset_email",
                "permission": True
            })
        
        # Employees can request their own password reset
        if doc.user_id == frappe.session.user:
            actions.append({
                "label": _("Request Password Reset"),
                "action": "request_password_reset",
                "permission": True
            })
    
    return actions
