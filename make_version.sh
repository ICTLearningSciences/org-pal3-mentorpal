#!/bin/bash

cd website_version && \
npm version patch && \
cd ..

VERSION=$(node -p "require('./website_version/package.json').version") 

git tag -a v${VERSION} -m "version ${VERSION} for deployment"
git push
git push --tags