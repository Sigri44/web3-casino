import React, { useState, useEffect } from 'react';
import { Coins, Users, Clock, Trophy, Wallet } from 'lucide-react';

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
    if (contract) {
      loadContractData();
      const interval = setInterval(loadContractData, 3000);
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
      
      const ethersProvider = new window.ethers.providers.Web3Provider(window.ethereum);
      const signer = ethersProvider.getSigner();
      const casinoContract = new window.ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
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

      setPot(window.ethers.utils.formatEther(potValue));
      setPlayers(playersList);
      setMinEntry(window.ethers.utils.formatEther(minEntryValue));
      setCanDraw(canDrawValue);
      setCurrentRoundId(roundId.toNumber());

      if (account) {
        const contribution = await contract.getPlayerContribution(account);
        setMyContribution(window.ethers.utils.formatEther(contribution));
      }

      // Load round info for timer
      const roundInfo = await contract.getRoundInfo(roundId);
      const startTime = roundInfo[1].toNumber();
      const duration = await contract.roundDuration();
      const endTime = startTime + duration.toNumber();
      const now = Math.floor(Date.now() / 1000);
      setTimeLeft(Math.max(0, endTime - now));

      // Load history
      if (roundId.toNumber() > 1) {
        const history = [];
        for (let i = Math.max(1, roundId.toNumber() - 5); i < roundId.toNumber(); i++) {
          const info = await contract.getRoundInfo(i);
          if (info[4]) { // if drawn
            history.push({
              roundId: i,
              winner: info[3],
              pot: window.ethers.utils.formatEther(info[2])
            });
          }
        }
        setRoundHistory(history.reverse());
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const enterCasino = async () => {
    if (!contract || loading) return;

    try {
      setLoading(true);
      const tx = await contract.enter({
        value: window.ethers.utils.parseEther(entryAmount)
      });
      await tx.wait();
      await loadContractData();
      alert('Vous êtes entré dans le casino! 🎰');
    } catch (error) {
      console.error('Error entering casino:', error);
      alert('Erreur lors de l\'entrée');
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
      alert('Erreur lors du tirage');
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-900 to-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 py-8">
          <h1 className="text-6xl font-bold mb-2 animate-pulse">🎰 CASINO</h1>
          <p className="text-xl text-gray-300">No Crying in the Casino!</p>
          {!account && (
            <button
              onClick={connectWallet}
              className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105"
            >
              <Wallet className="inline mr-2" size={20} />
              Connecter Wallet
            </button>
          )}
          {account && (
            <div className="mt-4 text-green-400">
              Connecté: {formatAddress(account)}
            </div>
          )}
        </div>

        {account && (
          <>
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 p-6 rounded-xl shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">POT ACTUEL</p>
                    <p className="text-3xl font-bold">{parseFloat(pot).toFixed(4)} ETH</p>
                    <p className="text-xs mt-1">95% au gagnant</p>
                  </div>
                  <Coins size={48} className="opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-xl shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">JOUEURS</p>
                    <p className="text-3xl font-bold">{players.length}</p>
                    <p className="text-xs mt-1">participants</p>
                  </div>
                  <Users size={48} className="opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-600 to-red-800 p-6 rounded-xl shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">TEMPS RESTANT</p>
                    <p className="text-3xl font-bold">{formatTime(timeLeft)}</p>
                    <p className="text-xs mt-1">jusqu'au tirage</p>
                  </div>
                  <Clock size={48} className="opacity-50" />
                </div>
              </div>
            </div>

            {/* Enter Section */}
            <div className="bg-black bg-opacity-50 p-8 rounded-xl mb-8 backdrop-blur">
              <h2 className="text-2xl font-bold mb-4">🎲 Entrer dans la partie</h2>
              <p className="text-gray-300 mb-4">
                Mise minimum: {minEntry} ETH | Votre contribution: {myContribution} ETH
              </p>
              <div className="flex gap-4">
                <input
                  type="number"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  step="0.01"
                  min={minEntry}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                  placeholder="Montant en ETH"
                />
                <button
                  onClick={enterCasino}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-8 py-3 rounded-lg font-bold transition-all transform hover:scale-105"
                >
                  {loading ? 'Chargement...' : 'ENTRER'}
                </button>
              </div>
            </div>

            {/* Draw Button */}
            {canDraw && (
              <div className="bg-gradient-to-r from-yellow-500 to-red-500 p-8 rounded-xl mb-8 text-center">
                <h2 className="text-3xl font-bold mb-4">🎉 TIRAGE DISPONIBLE!</h2>
                <button
                  onClick={draw}
                  disabled={loading}
                  className="bg-white text-black hover:bg-gray-200 disabled:bg-gray-400 px-12 py-4 rounded-full font-bold text-xl transition-all transform hover:scale-110"
                >
                  {loading ? 'Tirage...' : 'TIRER AU SORT 🎰'}
                </button>
              </div>
            )}

            {/* Players List */}
            <div className="bg-black bg-opacity-50 p-8 rounded-xl mb-8 backdrop-blur">
              <h2 className="text-2xl font-bold mb-4">👥 Joueurs actuels</h2>
              {players.length === 0 ? (
                <p className="text-gray-400">Aucun joueur pour le moment...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {players.map((player, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg ${
                        player.toLowerCase() === account.toLowerCase()
                          ? 'bg-green-900 border-2 border-green-500'
                          : 'bg-gray-800'
                      }`}
                    >
                      {formatAddress(player)}
                      {player.toLowerCase() === account.toLowerCase() && ' (Vous)'}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* History */}
            {roundHistory.length > 0 && (
              <div className="bg-black bg-opacity-50 p-8 rounded-xl backdrop-blur">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Trophy size={24} className="text-yellow-500" />
                  Historique des gagnants
                </h2>
                <div className="space-y-3">
                  {roundHistory.map((round) => (
                    <div
                      key={round.roundId}
                      className="bg-gray-800 p-4 rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <span className="text-yellow-500 font-bold">Round #{round.roundId}</span>
                        <span className="ml-4">{formatAddress(round.winner)}</span>
                      </div>
                      <div className="text-green-400 font-bold">
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

      {/* Ethers.js CDN */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js"></script>
    </div>
  );
}