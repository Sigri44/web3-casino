import React, { useState, useEffect } from 'react';
import { Coins, Users, Clock, Trophy, Wallet } from 'lucide-react';
import { ethers } from 'ethers';
import './App.css';

const CONTRACT_ADDRESS = "0x6E425e70119637DAa8026b008B2402426a44C2d9";
const CONTRACT_ABI = [
  "function enter() payable",
  "function drawWinner()",
  "function getCurrentPlayers() view returns (address[])",
  "function getCurrentPot() view returns (uint256)",
  "function getPlayerContribution(address) view returns (uint256)",
  "function canDraw() view returns (bool)",
  "function minEntry() view returns (uint256)",
  "function roundDuration() view returns (uint256)",
  "function currentRoundId() view returns (uint256)",
  "function getRoundInfo(uint256) view returns (uint256, uint256, uint256, address, bool, uint256)",
  "event PlayerEntered(address indexed player, uint256 amount, uint256 roundId)",
  "event RoundDrawn(uint256 indexed roundId, address indexed winner, uint256 prize)",
  "event NewRoundStarted(uint256 indexed roundId, uint256 startTime)"
];

export default function CasinoApp() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [pot, setPot] = useState('0');
  const [players, setPlayers] = useState([]);
  const [myContribution, setMyContribution] = useState('0');
  const [entryAmount, setEntryAmount] = useState('0.01');
  const [minEntry, setMinEntry] = useState('0');
  const [timeLeft, setTimeLeft] = useState(0);
  const [canDraw, setCanDraw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roundHistory, setRoundHistory] = useState([]);
  const [currentRoundId, setCurrentRoundId] = useState(0);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (contract && account) {
      loadContractData();
      const interval = setInterval(loadContractData, 5000);
      return () => clearInterval(interval);
    }
  }, [contract, account]);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connectWallet();
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Veuillez installer MetaMask!');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      
      // Vérifier le réseau
      const network = await ethersProvider.getNetwork();
      const chainId = Number(network.chainId);
      
      if (chainId !== 11155111) {
        const switchNetwork = window.confirm(
          `Vous êtes sur le réseau ${chainId}. Voulez-vous basculer sur Sepolia ?`
        );
        if (switchNetwork) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0xaa36a7' }],
            });
          } catch (switchError) {
            console.error('Error switching network:', switchError);
            return;
          }
        } else {
          return;
        }
      }
      
      const signer = await ethersProvider.getSigner();
      const casinoContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      setAccount(accounts[0]);
      setProvider(ethersProvider);
      setContract(casinoContract);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Erreur de connexion au wallet');
    }
  };

  const loadContractData = async () => {
    if (!contract) return;

    try {
      const [potValue, playersList, minEntryValue, canDrawValue, roundId] = await Promise.all([
        contract.getCurrentPot(),
        contract.getCurrentPlayers(),
        contract.minEntry(),
        contract.canDraw(),
        contract.currentRoundId()
      ]);

      setPot(ethers.formatEther(potValue));
      setPlayers(playersList);
      setMinEntry(ethers.formatEther(minEntryValue));
      setCanDraw(canDrawValue);
      setCurrentRoundId(Number(roundId));

      if (account) {
        const contribution = await contract.getPlayerContribution(account);
        setMyContribution(ethers.formatEther(contribution));
      }

      // Load round info for timer
      const roundInfo = await contract.getRoundInfo(roundId);
      const startTime = Number(roundInfo[1]);
      const duration = await contract.roundDuration();
      const endTime = startTime + Number(duration);
      const now = Math.floor(Date.now() / 1000);
      setTimeLeft(Math.max(0, endTime - now));

      // Load history
      if (Number(roundId) > 1) {
        const history = [];
        for (let i = Math.max(1, Number(roundId) - 5); i < Number(roundId); i++) {
          const info = await contract.getRoundInfo(i);
          if (info[4]) {
            history.push({
              roundId: i,
              winner: info[3],
              pot: ethers.formatEther(info[2])
            });
          }
        }
        setRoundHistory(history.reverse());
      }
    } catch (error) {
      // Silencieux - normal pendant le chargement initial
      console.log('Loading contract data...');
    }
  };

  const enterCasino = async () => {
    if (!contract || loading) return;

    try {
      setLoading(true);
      const tx = await contract.enter({
        value: ethers.parseEther(entryAmount)
      });
      await tx.wait();
      await loadContractData();
      alert('Vous êtes entré dans le casino! 🎰');
    } catch (error) {
      console.error('Error entering casino:', error);
      alert('Erreur: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  const draw = async () => {
    if (!contract || loading || !canDraw) return;

    try {
      setLoading(true);
      const tx = await contract.drawWinner();
      await tx.wait();
      await loadContractData();
      alert('Tirage effectué! Vérifiez le gagnant 🏆');
    } catch (error) {
      console.error('Error drawing:', error);
      alert('Erreur: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      <div className="app-content">
        {/* Header */}
        <div className="header">
          <h1 className="title">🎰 CASINO</h1>
          <p className="subtitle">No Crying in the Casino!</p>
          {!account && (
            <button onClick={connectWallet} className="btn-connect">
              <Wallet className="icon-inline" size={20} />
              Connecter Wallet
            </button>
          )}
          {account && (
            <div className="connected">
              Connecté: {formatAddress(account)}
              <br />
              <span className="network-info">Réseau: Sepolia</span>
            </div>
          )}
        </div>

        {account && (
          <>
            {/* Main Stats */}
            <div className="stats-grid">
              <div className="stat-card stat-pot">
                <div className="stat-content">
                  <div>
                    <p className="stat-label">POT ACTUEL</p>
                    <p className="stat-value">{pot ? parseFloat(pot).toFixed(4) : '0.0000'} ETH</p>
                    <p className="stat-subtitle">95% au gagnant</p>
                  </div>
                  <Coins size={48} className="stat-icon" />
                </div>
              </div>

              <div className="stat-card stat-players">
                <div className="stat-content">
                  <div>
                    <p className="stat-label">JOUEURS</p>
                    <p className="stat-value">{players ? players.length : 0}</p>
                    <p className="stat-subtitle">participants</p>
                  </div>
                  <Users size={48} className="stat-icon" />
                </div>
              </div>

              <div className="stat-card stat-time">
                <div className="stat-content">
                  <div>
                    <p className="stat-label">TEMPS RESTANT</p>
                    <p className="stat-value">{formatTime(timeLeft)}</p>
                    <p className="stat-subtitle">jusqu'au tirage</p>
                  </div>
                  <Clock size={48} className="stat-icon" />
                </div>
              </div>
            </div>

            {/* Enter Section */}
            <div className="section">
              <h2 className="section-title">🎲 Entrer dans la partie</h2>
              <p className="section-subtitle">
                Mise minimum: {minEntry || '0'} ETH | Votre contribution: {myContribution || '0'} ETH
              </p>
              <div className="entry-form">
                <input
                  type="number"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  step="0.01"
                  min={minEntry}
                  className="input-amount"
                  placeholder="Montant en ETH"
                  disabled={!contract}
                />
                <button
                  onClick={enterCasino}
                  disabled={loading || !contract}
                  className="btn-enter"
                >
                  {loading ? 'Chargement...' : 'ENTRER'}
                </button>
              </div>
            </div>

            {/* Draw Button */}
            {canDraw && (
              <div className="draw-section">
                <h2 className="draw-title">🎉 TIRAGE DISPONIBLE!</h2>
                <button onClick={draw} disabled={loading} className="btn-draw">
                  {loading ? 'Tirage...' : 'TIRER AU SORT 🎰'}
                </button>
              </div>
            )}

            {/* Players List */}
            <div className="section">
              <h2 className="section-title">👥 Joueurs actuels</h2>
              {!players || players.length === 0 ? (
                <p className="empty-message">Aucun joueur pour le moment...</p>
              ) : (
                <div className="players-grid">
                  {players.map((player, i) => (
                    <div
                      key={`${player}-${i}`}
                      className={`player-card ${
                        account && player.toLowerCase() === account.toLowerCase()
                          ? 'player-card-me'
                          : ''
                      }`}
                    >
                      {formatAddress(player)}
                      {account && player.toLowerCase() === account.toLowerCase() && ' (Vous)'}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* History */}
            {roundHistory && roundHistory.length > 0 && (
              <div className="section">
                <h2 className="section-title">
                  <Trophy size={24} className="icon-inline" style={{color: '#fbbf24'}} />
                  Historique des gagnants
                </h2>
                <div className="history-list">
                  {roundHistory.map((round) => (
                    <div key={round.roundId} className="history-card">
                      <div>
                        <span className="round-number">Round #{round.roundId}</span>
                        <span className="winner-address">{formatAddress(round.winner)}</span>
                      </div>
                      <div className="prize-amount">
                        +{parseFloat(round.pot * 0.95).toFixed(4)} ETH
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}