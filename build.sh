#!/bin/bash

if [[ $VERCEL_ENV == "preview"  ]] ; then 
	export NEXT_PUBLIC_CONVEX_URL=$(npx convex preview $VERCEL_GIT_COMMIT_REF) && npm run build
elif [[ $VERCEL_ENV == "production" ]]; then  
  npm run build && npx convex deploy
else
	# Command for dev if relevant
	echo "No dev command"
fi
