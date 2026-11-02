# Mistério no Aurora

Jogo de dedução online para jogar com amigos, cada um no seu computador.
Transatlântico, 1927: descubra quem matou Augusto Faria, com qual arma e em qual sala.

- Site estático (GitHub Pages), sem servidor: as conexões são diretas entre os navegadores (PeerJS/WebRTC).
- O anfitrião cria a sala e manda o link `?sala=XXXX`. Ele precisa manter a aba aberta durante a partida.
- Se alguém cair, é só abrir o link de novo. Se o anfitrião recarregar, aparece "Retomar a partida" na capa.

## Rodar local
```
python3 -m http.server 8765
```
Abra http://localhost:8765
