# Script di Esecuzione

Questa directory contiene gli **script Python deterministici** del progetto.

## Ruolo

Gli script qui sono i **tool** del sistema. Gestiscono:
- Chiamate API
- Elaborazione dati
- Operazioni su file
- Interazioni con database

## Regole

1. **Deterministici**: dato lo stesso input, producono sempre lo stesso output.
2. **Ben commentati**: ogni script deve essere auto-documentante.
3. **Testabili**: devono poter essere eseguiti indipendentemente.
4. **Usa `.env`**: le credenziali e i token vanno in `.env`, mai hardcoded.

## Naming convention

```
execution/
├── scrape_single_site.py     # Scraping di un singolo sito
├── process_data.py           # Elaborazione dati generica
├── export_to_sheets.py       # Export verso Google Sheets
└── README.md                 # Questo file
```

## Come creare un nuovo script

```python
"""
Nome Script — Descrizione breve
================================
Dettagli su cosa fa lo script, quando usarlo, e come.
"""

import os
from dotenv import load_dotenv

load_dotenv()

def main():
    """Entry point dello script."""
    # La tua logica qui
    pass

if __name__ == "__main__":
    main()
```
