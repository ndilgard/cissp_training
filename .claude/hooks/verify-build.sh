#!/bin/bash
cd /home/nate/Claude_Code/Projects/CISSP-Exam
# Only run if there are uncommitted JS/JSX changes
if git diff --name-only HEAD 2>/dev/null | grep -qE '\.(jsx?|tsx?)$'; then
    npm run build 2>&1 | tail -15
fi
