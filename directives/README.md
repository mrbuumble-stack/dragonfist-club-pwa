# Direttive

Questa directory contiene le **SOP (Standard Operating Procedures)** del progetto, scritte in Markdown.

## Cosa sono le direttive?

Ogni direttiva è un documento che definisce:
- **Obiettivo**: cosa deve essere fatto
- **Input**: dati o contesto necessari
- **Tool/Script**: quali script in `execution/` utilizzare
- **Output**: risultato atteso
- **Casi limite**: errori comuni e come gestirli

## Come creare una nuova direttiva

Crea un file `.md` in questa directory con il seguente template:

```markdown
# Nome Direttiva

## Obiettivo
[Descrivi cosa deve essere fatto]

## Input
- [Elenca gli input necessari]

## Script da usare
- `execution/nome_script.py` — [Descrizione]

## Output
- [Descrivi il risultato atteso]

## Casi limite
- [Errore X] → [Soluzione Y]
```

## Regole
- Le direttive sono **documenti vivi**: aggiornale quando impari qualcosa di nuovo.
- Non creare direttive senza prima consultare l'utente.
- Ogni direttiva dovrebbe avere almeno uno script corrispondente in `execution/`.
