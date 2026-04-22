<h1 align="center">NGF (NEXT-generative firewall)</h1>

NGF is a cross-platform firewall.

## install
```bash
sudo npm install -g @tipix.dev/ngf
```
or Windows

open a command line as administrator
```bat
npm install -g @tipix.dev/ngf
```

## quick Start
### Windows
1. Install node.js
```bat
winget install OpenJS.NodeJS.LTS
```
2. Download NGF in the *install* section
3. Done

### MacOS
1. Add table to pf.conf
```bash
echo 'table <ngf> persist' | sudo tee -a /etc/pf.conf
```
2. Restart PF
```bash
sudo pfctl -f /etc/pf.conf
sudo pfctl -e
```
3. Download NGF in the *install* section
4. Done

### Linux
1. Install node.js
```bash
sudo pacman -S nodejs npm
```
2. Download NGF in the *install* section
3. Done
