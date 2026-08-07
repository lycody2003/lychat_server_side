# Docker Build and Docker Up

```bash
docker compose build
docker compose up
```

# Push code without .env when catching
```bash
cat .gitignore
git ls-files | grep -i env
git status
```

```bash
git rm --cached .env
git commit -m "stop tracking .env"
git push origin main
```

```bash
git add .gitignore
git commit -m "add .env to gitignore"
git push origin main
```