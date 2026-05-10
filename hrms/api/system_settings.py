import frappe


@frappe.whitelist(allow_guest=True)
def get_user_pass_login_disabled():
	return frappe.get_system_settings("disable_user_pass_login")


@frappe.whitelist()
def get_shift_end_reminder_settings():
	"""Return global enable flag and per-user opt-out preference."""
	import json

	global_enabled = frappe.db.get_single_value("HR Settings", "enable_shift_end_reminder")
	minutes_before = frappe.db.get_single_value("HR Settings", "shift_end_reminder_minutes_before") or 30

	user_enabled = True  # default: opted in
	try:
		result = frappe.db.sql(
			"SELECT `data` FROM `__UserSettings` WHERE `user`=%s AND `doctype`=%s",
			(frappe.session.user, "HRMS"),
			as_dict=True,
		)
		if result and result[0].get("data"):
			prefs = json.loads(result[0]["data"])
			user_enabled = prefs.get("shift_end_reminder", True)
	except Exception:
		pass

	return {
		"global_enabled": bool(global_enabled),
		"user_enabled": bool(user_enabled),
		"minutes_before": int(minutes_before),
	}


@frappe.whitelist()
def set_shift_end_reminder_preference(enabled):
	"""Store per-user opt-in/opt-out preference for shift end reminder."""
	import json

	enabled = frappe.parse_json(enabled) if isinstance(enabled, str) else enabled

	# Read existing user settings for HRMS doctype
	existing = frappe.db.sql(
		"SELECT `data` FROM `__UserSettings` WHERE `user`=%s AND `doctype`=%s",
		(frappe.session.user, "HRMS"),
		as_dict=True,
	)

	if existing and existing[0].get("data"):
		prefs = json.loads(existing[0]["data"])
	else:
		prefs = {}

	prefs["shift_end_reminder"] = bool(enabled)

	frappe.db.sql(
		"""INSERT INTO `__UserSettings` (`user`, `doctype`, `data`)
		VALUES (%s, %s, %s)
		ON DUPLICATE KEY UPDATE `data`=%s""",
		(frappe.session.user, "HRMS", json.dumps(prefs), json.dumps(prefs)),
	)
	frappe.db.commit()

	return {"success": True, "shift_end_reminder": bool(enabled)}
