## 腾讯轻量（Ubuntu 22.04）Docker 部署

### 1. 服务器准备（在服务器执行）

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

### 2. DNS 与防火墙

- 域名 `A 记录` 指向服务器公网 IP
- 腾讯轻量安全组放行：80、443（以及 22）

### 3. 拉取代码并配置环境

```bash
mkdir -p /opt/buzsystem
cd /opt/buzsystem
git clone <你的仓库地址> .
cd ops/docker
cp .env.example .env
```

编辑 `.env`（必须改掉密码与 JWT_SECRET）：

```bash
nano .env
```

### 4. 启动

```bash
docker compose up -d --build
docker compose ps
```

### 5. 验证

- 访问 `https://你的域名/`
- API：`https://你的域名/api/debug`

### 6. 更新部署

```bash
cd /opt/buzsystem
git pull
cd ops/docker
docker compose up -d --build
```

