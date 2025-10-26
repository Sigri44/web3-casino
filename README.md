# 🎰 Guide de Déploiement Casino

## 📋 Prérequis

- Node.js et npm installés
- MetaMask installé dans votre navigateur
- Des ETH de testnet (Sepolia recommandé)

## 🔧 Étape 1 : Obtenir des ETH de testnet

### Sepolia Testnet (recommandé)
1. Allez sur https://sepoliafaucet.com/
2. Connectez votre wallet MetaMask
3. Demandez des ETH de test (0.5 ETH gratuit)

### Autres faucets :
- https://faucets.chain.link/sepolia
- https://www.alchemy.com/faucets/ethereum-sepolia

## 🚀 Étape 2 : Déployer le Smart Contract

### Option A : Avec Remix (Facile)

1. **Allez sur Remix** : https://remix.ethereum.org
2. **Créez un nouveau fichier** `Casino.sol` et collez le code du contrat
3. **Compilez** :
   - Cliquez sur l'icône "Solidity Compiler"
   - Sélectionnez version `0.8.20`
   - Cliquez "Compile Casino.sol"

4. **Déployez** :
   - Cliquez sur "Deploy & Run Transactions"
   - Environment : sélectionnez "Injected Provider - MetaMask"
   - Vérifiez que vous êtes sur Sepolia dans MetaMask
   - Dans le champ du constructeur, entrez :
     ```
     _minEntry: 10000000000000000 (0.01 ETH en wei)
     _roundDuration: 300 (5 minutes en secondes)
     ```
   - Cliquez "Deploy" et confirmez dans MetaMask
   
5. **Copiez l'adresse** du contrat déployé (elle apparaîtra en bas)

### Option B : Avec Hardhat (Avancé)

```bash
# Créer un projet
mkdir casino-contract
cd casino-contract
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Initialiser Hardhat
npx hardhat init

# Créer le fichier de déploiement
# scripts/deploy.js
```

```javascript
async function main() {
  const Casino = await ethers.getContractFactory("Casino");
  const casino = await Casino.deploy(
    ethers.utils.parseEther("0.01"), // minEntry
    300 // roundDuration (5 minutes)
  );
  await casino.deployed();
  console.log("Casino deployed to:", casino.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

```bash
# Déployer
npx hardhat run scripts/deploy.js --network sepolia
```

## 💻 Étape 3 : Configurer l'Interface

1. **Mettez à jour l'adresse du contrat** dans l'interface React :
   ```javascript
   const CONTRACT_ADDRESS = "VOTRE_ADRESSE_ICI";
   ```

2. **Configurez MetaMask** :
   - Réseau : Sepolia Testnet
   - Chain ID : 11155111
   - RPC URL : https://sepolia.infura.io/v3/YOUR-API-KEY

## 🌐 Étape 4 : Déployer l'Interface

### Option A : CodeSandbox (Rapide)
1. Allez sur https://codesandbox.io
2. Créez un nouveau projet React
3. Collez le code de l'interface
4. L'URL sera générée automatiquement

### Option B : Netlify (Professionnel)

```bash
# Créer un projet React
npx create-react-app casino-frontend
cd casino-frontend

# Installer les dépendances
npm install ethers lucide-react

# Remplacer src/App.js avec le code de l'interface
# Ajouter dans public/index.html avant </body> :
<script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js"></script>

# Build
npm run build

# Déployer sur Netlify
# 1. Créez un compte sur https://netlify.com
# 2. Drag & drop le dossier "build"
```

### Option C : GitHub Pages

```bash
# Dans package.json, ajoutez :
"homepage": "https://VOTRE-USERNAME.github.io/casino",

# Installez gh-pages
npm install --save-dev gh-pages

# Ajoutez dans scripts:
"predeploy": "npm run build",
"deploy": "gh-pages -d build"

# Déployez
npm run deploy
```

## ⚙️ Configuration Avancée

### Modifier la durée des rounds
```solidity
// Dans le constructeur ou après déploiement :
300 secondes = 5 minutes
600 secondes = 10 minutes
1800 secondes = 30 minutes
```

### Modifier la mise minimum
```javascript
// En wei (18 décimales)
0.01 ETH = 10000000000000000 wei
0.1 ETH = 100000000000000000 wei
1 ETH = 1000000000000000000 wei
```

## 🎮 Test du Casino

1. **Connectez plusieurs wallets** (créez plusieurs comptes MetaMask)
2. **Entrez dans le casino** avec chaque wallet
3. **Attendez** la fin du timer
4. **Cliquez sur "Tirer au sort"** avec n'importe quel wallet
5. **Vérifiez** que le gagnant reçoit 95% du pot

## 🔒 Sécurité

⚠️ **IMPORTANT pour la production** :

Le contrat actuel utilise `block.timestamp` et `block.prevrandao` pour le random, ce qui n'est **PAS sécurisé** pour de l'argent réel.

Pour la production, utilisez **Chainlink VRF** :
```solidity
// Installation
npm install @chainlink/contracts

// Intégration VRF
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
```

## 📊 Monitoring

### Voir les transactions sur Etherscan
- Sepolia : https://sepolia.etherscan.io/address/VOTRE_ADRESSE

### Événements à surveiller
- `PlayerEntered` : Nouveau joueur
- `RoundDrawn` : Tirage effectué
- `NewRoundStarted` : Nouveau round

## 🐛 Dépannage

**Erreur "User rejected transaction"**
→ L'utilisateur a annulé dans MetaMask

**Erreur "Entry too small"**
→ Augmentez le montant (minimum 0.01 ETH)

**Erreur "Round not finished"**
→ Attendez la fin du timer

**Interface ne charge pas**
→ Vérifiez que MetaMask est connecté à Sepolia

## 📱 Testnets Recommandés

| Testnet | Chain ID | Faucet | Explorer |
|---------|----------|--------|----------|
| Sepolia | 11155111 | sepoliafaucet.com | sepolia.etherscan.io |
| Mumbai (Polygon) | 80001 | faucet.polygon.technology | mumbai.polygonscan.com |
| BSC Testnet | 97 | testnet.bnbchain.org/faucet-smart | testnet.bscscan.com |

## 🎯 Prochaines Étapes

1. ✅ Déployer sur testnet
2. ✅ Tester avec plusieurs wallets
3. ⬜ Ajouter Chainlink VRF pour production
4. ⬜ Audit de sécurité
5. ⬜ Déployer sur mainnet

## 💡 Améliorations Possibles

- Ajouter un système de tickets (1 ticket = 1 chance)
- Historique complet de tous les rounds
- Statistiques des joueurs
- Multiple pools simultanés
- NFT pour les gagnants
- Programme de référencement

---

**Besoin d'aide ?** Vérifiez la console du navigateur (F12) pour les erreurs détaillées.

**Testnet ETH gratuit** disponible sur tous les faucets listés ci-dessus.