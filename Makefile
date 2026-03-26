.PHONY: daily

daily: 
	node scripts/fetch-schedule.js && node scripts/proc_schedule.js
	node scripts/update_results.js > docs/mlb2026-results.json
