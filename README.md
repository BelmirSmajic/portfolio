# Analytics Portfolio

Live portfolio: https://belmirsmajic.github.io/portfolio/

Combined public portfolio site for selected analytics projects.

The site presents real professional business context first and uses public synthetic demonstrations as supporting artifacts where applicable. The World Cup analysis is labeled as independent public research.

## Local validation

```powershell
python scripts/validate_site.py
python -m http.server 8767 --directory .
```

## Deployment

GitHub Actions publishes the static site to the `gh-pages` branch for GitHub Pages.
