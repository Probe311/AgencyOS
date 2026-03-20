# Guide de Contribution

Merci de votre intérêt pour contribuer à AgencyOS ! 🎉

## Comment contribuer

### 1. Fork et Clone

1. Fork le repository
2. Clone votre fork localement :
```bash
git clone https://github.com/votre-username/AgencyOS.git
cd AgencyOS
```

### 2. Créer une branche

Créez une branche pour votre fonctionnalité ou correction :
```bash
git checkout -b feature/ma-fonctionnalite
# ou
git checkout -b fix/mon-bug
```

### 3. Installer les dépendances

```bash
npm install
```

### 4. Développer

- Écrivez du code propre et bien commenté
- Suivez les conventions de code existantes
- Ajoutez des tests si nécessaire
- Vérifiez que le code compile sans erreurs

### 5. Commit

Utilisez des messages de commit clairs et descriptifs :
```bash
git add .
git commit -m "feat: ajout de la fonctionnalité X"
```

Conventions de commit :
- `feat:` pour une nouvelle fonctionnalité
- `fix:` pour une correction de bug
- `docs:` pour la documentation
- `style:` pour le formatage
- `refactor:` pour le refactoring
- `test:` pour les tests
- `chore:` pour les tâches de maintenance

### 6. Push et Pull Request

```bash
git push origin feature/ma-fonctionnalite
```

Ensuite, créez une Pull Request sur GitHub avec :
- Une description claire de ce qui a été fait
- Des captures d'écran si applicable
- Référence aux issues liées si applicable

## Standards de code

- Utilisez TypeScript pour tout le code
- Suivez les conventions ESLint/Prettier
- Écrivez des composants React réutilisables
- Documentez les fonctions complexes
- Utilisez des noms de variables explicites

## Questions ?

N'hésitez pas à ouvrir une issue pour toute question !
