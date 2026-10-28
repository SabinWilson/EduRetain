FEATURE_NAMES = [
    "avg_attendance",
    "attendance_trend",
    "avg_gpa",
    "gpa_trend",
    "backlog_count",
    "assignment_miss_rate",
    "lms_login_frequency",
    "lms_time_spent",
    "engagement_trend",
    "semester",
    "year"
]

FEATURE_METADATA = {
    "avg_attendance": {
        "label": "Average Attendance",
        "unit": "%",
        "description": "Student's cumulative attendance across all enrolled subjects"
    },
    "attendance_trend": {
        "label": "Attendance Trend",
        "unit": "pts",
        "description": "Month-over-month trajectory in lecture attendance"
    },
    "avg_gpa": {
        "label": "Cumulative GPA",
        "unit": "/10",
        "description": "Grade point average on 10-point scale"
    },
    "gpa_trend": {
        "label": "GPA Trajectory",
        "unit": "pts",
        "description": "Semester-over-semester change in internal and term GPA"
    },
    "backlog_count": {
        "label": "Active Course Backlogs",
        "unit": "courses",
        "description": "Number of failed or uncleared subjects"
    },
    "assignment_miss_rate": {
        "label": "Assignment Non-Submission Rate",
        "unit": "%",
        "description": "Proportion of LMS assignments not submitted by deadline"
    },
    "lms_login_frequency": {
        "label": "Weekly LMS Logins",
        "unit": "sessions/wk",
        "description": "Frequency of access to course portal and LMS"
    },
    "lms_time_spent": {
        "label": "Weekly LMS Study Time",
        "unit": "mins/wk",
        "description": "Active learning time recorded on digital course materials"
    },
    "engagement_trend": {
        "label": "Digital Engagement Trend",
        "unit": "%",
        "description": "Change in weekly active platform interaction"
    },
    "semester": {
        "label": "Current Semester",
        "unit": "",
        "description": "Academic semester of the student"
    },
    "year": {
        "label": "Academic Year",
        "unit": "Year",
        "description": "Degree program year"
    }
}
