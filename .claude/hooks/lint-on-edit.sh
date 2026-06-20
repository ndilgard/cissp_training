#!/bin/bash
input=$(cat)
file=$(echo "$input" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")

if [[ "$file" =~ \.(jsx?|tsx?)$ ]]; then
    cd /home/nate/Claude_Code/Projects/CISSP-Exam
    npm run lint 2>&1
fi
