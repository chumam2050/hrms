/**
 * Employee Password Reset Frontend
 * Add password reset buttons to Employee form
 */

frappe.ui.form.on("Employee", {
    refresh: function (frm) {
        // Add custom buttons for password reset if user has permission
        add_password_reset_buttons(frm);
    },
});

function add_password_reset_buttons(frm) {
    // Check if employee has user linked
    if (!frm.doc.user_id) {
        return;
    }

    // Check permissions
    const is_hr_user = frappe.user_roles.includes("HR User");
    const is_self = frappe.session.user === frm.doc.user_id;

    if (!is_hr_user && !is_self) {
        return;
    }

    // Add "Reset Password" button for HR Users
    if (is_hr_user) {
        frm.add_custom_button(__("Reset Password"), function () {
            show_reset_password_dialog(frm);
        });

        frm.add_custom_button(
            __("Send Password Reset Email"),
            function () {
                send_password_reset_email(frm);
            },
            __("Password")
        );
    }

    // Add "Request Password Reset" for self
    if (is_self) {
        frm.add_custom_button(
            __("Request Password Reset"),
            function () {
                request_password_reset(frm);
            },
            __("Password")
        );
    }
}

function show_reset_password_dialog(frm) {
    const dialog = new frappe.ui.Dialog({
        title: __("Reset Password for {0}", [frm.doc.name]),
        fields: [
            {
                label: __("New Password"),
                fieldname: "new_password",
                fieldtype: "Password",
                reqd: 1,
            },
            {
                label: __("Confirm Password"),
                fieldname: "confirm_password",
                fieldtype: "Password",
                reqd: 1,
            },
            {
                label: __("Generate Random Password"),
                fieldname: "use_random",
                fieldtype: "Check",
                description: __("Check to auto-generate a strong random password"),
            },
            {
                fieldname: "strength_section",
                fieldtype: "Section Break",
                label: __("Password Strength"),
                hidden: 1,
            },
            {
                label: __("Strength"),
                fieldname: "strength",
                fieldtype: "Data",
                read_only: 1,
                hidden: 1,
            },
        ],
        primary_action_label: __("Reset Password"),
        primary_action: function () {
            const values = dialog.get_values();

            // Validate passwords match if not using random
            if (!values.use_random) {
                if (values.new_password !== values.confirm_password) {
                    frappe.msgprint(__("Passwords do not match"));
                    return;
                }
            }

            // Reset password
            frappe.call({
                method: "hrms.utils.password_reset.reset_employee_password",
                args: {
                    employee_id: frm.doc.name,
                    new_password: values.use_random ? null : values.new_password,
                },
                callback: function (r) {
                    if (r.message.success) {
                        if (r.message.password) {
                            frappe.msgprint({
                                title: __("Password Reset Successful"),
                                message: __(
                                    "New Password: <strong>{0}</strong><br><br>Please save this password securely.",
                                    [r.message.password]
                                ),
                                indicator: "green",
                            });
                        } else {
                            frappe.msgprint({
                                title: __("Password Reset Successful"),
                                message: r.message.message,
                                indicator: "green",
                            });
                        }
                        dialog.hide();
                        frm.refresh();
                    }
                },
            });
        },
    });

    // Add event listener for password strength on text change with debounce
    let strength_timeout = null;
    dialog.fields_dict.new_password.$input.on("input", function () {
        const password = $(this).val();
        clearTimeout(strength_timeout);
        if (password) {
            strength_timeout = setTimeout(() => {
                check_password_strength(dialog, password);
            }, 500);
        }
    });

    dialog.fields_dict.use_random.$input.on("change", function () {
        const is_random = $(this).is(":checked");
        dialog.set_df_property("new_password", "reqd", !is_random);
        dialog.set_df_property("confirm_password", "reqd", !is_random);
    });

    dialog.show();
}

function check_password_strength(dialog, password) {
    frappe.call({
        method: "hrms.utils.password_reset.validate_password_strength",
        args: { password: password },
        callback: function (r) {
            if (r.message) {
                const strength_map = {
                    0: "Very Weak - Red",
                    1: "Weak - Orange",
                    2: "Fair - Yellow",
                    3: "Good - Light Green",
                    4: "Strong - Green",
                    5: "Very Strong - Dark Green",
                };

                const strength_val = strength_map[r.message.score] || "Unknown";
                
                // Unhide fields if they are hidden
                if (dialog.fields_dict.strength.df.hidden) {
                    dialog.set_df_property("strength_section", "hidden", false);
                    dialog.set_df_property("strength", "hidden", false);
                }
                
                // Set value without refreshing the whole dialog
                dialog.set_value("strength", strength_val);
            }
        },
    });
}

function send_password_reset_email(frm) {
    frappe.confirm(__("Send password reset email to {0}?", [frm.doc.user_id]), function () {
        frappe.call({
            method: "hrms.utils.password_reset.request_password_reset",
            args: { employee_id: frm.doc.name },
            callback: function (r) {
                if (r.message.success) {
                    frappe.msgprint({
                        title: __("Email Sent"),
                        message: r.message.message,
                        indicator: "green",
                    });
                }
            },
        });
    });
}

function request_password_reset(frm) {
    frappe.confirm(
        __(
            "Request a password reset? A reset link will be sent to your registered email."
        ),
        function () {
            frappe.call({
                method: "hrms.utils.password_reset.request_password_reset",
                args: { employee_id: frm.doc.name },
                callback: function (r) {
                    if (r.message.success) {
                        frappe.msgprint({
                            title: __("Password Reset Link Sent"),
                            message: r.message.message,
                            indicator: "green",
                        });
                    }
                },
            });
        }
    );
}
