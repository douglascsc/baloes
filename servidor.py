#!/usr/bin/env python3
"""
RoboSapiens 2026 - Robo Estoura Balao
Servidor local para usar DOIS computadores: um registra, outro exibe o telao.

Uso: dois cliques em "iniciar-servidor.bat" (Windows) ou  python3 servidor.py
- Neste PC (o que registra), o sistema abre em http://localhost:8000
- No PC do telao, abra o endereco de rede mostrado na tela (ex.: http://192.168.0.10:8000)

Somente este PC pode alterar os dados; os outros apenas visualizam.
Nao precisa de internet: basta os dois PCs estarem na mesma rede.
"""
import http.server
import json
import os
import socket
import sys
import threading
import time
import webbrowser
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(ROOT, "dados-competicao.json")
MAX_BODY = 5 * 1024 * 1024
PORTS = range(8000, 8011)

lock = threading.Lock()
store = {"rev": 0, "data": None}


def load_store():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            saved = json.load(f)
        if isinstance(saved, dict) and "data" in saved:
            store["rev"] = int(saved.get("rev", 0))
            store["data"] = saved["data"]
    except FileNotFoundError:
        pass
    except Exception as e:  # arquivo corrompido: guarda copia e segue vazio
        print("Aviso: nao foi possivel ler", DATA_FILE, "-", e)
        try:
            os.replace(DATA_FILE, DATA_FILE + ".corrompido")
        except OSError:
            pass


def persist():
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False)
    os.replace(tmp, DATA_FILE)


def lan_ips():
    """Enderecos deste PC na rede local. Os 169.254.x.x (cabo de rede direto
    entre dois PCs, sem roteador) aparecem por ultimo."""
    ips = set()
    for target in ("8.8.8.8", "192.168.0.1", "10.0.0.1", "169.254.255.255"):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect((target, 80))
            ips.add(s.getsockname()[0])
            s.close()
        except OSError:
            pass
    try:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
            ips.add(ip)
    except OSError:
        pass
    ips = [ip for ip in ips if not ip.startswith("127.") and not ip.startswith("0.")]
    return sorted(ips, key=lambda ip: (ip.startswith("169.254."), ip))


def is_direct(ip):
    return ip.startswith("169.254.")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def is_local(self):
        ip = self.client_address[0]
        return ip in ("127.0.0.1", "::1") or ip.startswith("::ffff:127.")

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def same_origin(self):
        """Bloqueia gravacoes feitas por outros sites abertos no navegador (CSRF):
        a origem, se enviada, precisa ser este proprio servidor."""
        origin = self.headers.get("Origin")
        if origin is None:
            return True
        port = self.server.server_address[1]
        return origin in (f"http://localhost:{port}", f"http://127.0.0.1:{port}", f"http://[::1]:{port}")

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/info":
            port = self.server.server_address[1]
            return self.send_json({"server": True, "local": self.is_local(),
                                   "urls": [f"http://{ip}:{port}/" for ip in lan_ips()]})
        if url.path == "/api/estado":
            since = parse_qs(url.query).get("since", [None])[0]
            with lock:
                out = {"rev": store["rev"], "now": int(time.time() * 1000)}
                if since is None or str(store["rev"]) != since:
                    out["data"] = store["data"]
            return self.send_json(out)
        # nao expoe o backup, o proprio servidor nem pastas ocultas (.git etc.)
        parts = [p for p in url.path.split("/") if p]
        if url.path.startswith("/dados-competicao") or any(p.startswith(".") or p == "__pycache__" for p in parts) \
                or url.path.lower().endswith((".py", ".bat", ".tmp", ".corrompido")):
            return self.send_error(404)
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/estado":
            return self.send_error(404)
        if not self.is_local() or not self.same_origin():
            return self.send_json({"erro": "Somente o PC que registra pode alterar os dados."}, 403)
        if not self.headers.get("Content-Type", "").startswith("application/json"):
            return self.send_json({"erro": "formato invalido"}, 415)
        try:
            n = int(self.headers.get("Content-Length", 0))
            if n <= 0 or n > MAX_BODY:
                return self.send_json({"erro": "tamanho invalido"}, 400)
            payload = json.loads(self.rfile.read(n).decode("utf-8"))
            data = payload.get("data")
            if not isinstance(data, dict) or not isinstance(data.get("teams"), list):
                return self.send_json({"erro": "formato invalido"}, 400)
        except (ValueError, UnicodeDecodeError):
            return self.send_json({"erro": "JSON invalido"}, 400)
        with lock:
            store["rev"] += 1
            store["data"] = data
            try:
                persist()
            except OSError as e:
                print("Aviso: nao foi possivel gravar o backup:", e)
            rev = store["rev"]
        return self.send_json({"rev": rev})

    def log_message(self, fmt, *args):
        pass  # sem poluir a janela


def main():
    load_store()
    server = None
    for port in PORTS:
        try:
            server = http.server.ThreadingHTTPServer(("0.0.0.0", port), Handler)
            break
        except OSError:
            continue
    if server is None:
        print("Nenhuma porta livre entre 8000 e 8010. Feche outros programas e tente de novo.")
        input("Enter para sair...")
        sys.exit(1)
    port = server.server_address[1]
    local_url = f"http://localhost:{port}/"
    ips = lan_ips()
    line = "=" * 64
    print(line)
    print("  ROBOSAPIENS 2026 - ROBO ESTOURA BALAO  |  servidor ligado")
    print(line)
    print(f"  NESTE PC (registro):   {local_url}")
    print()
    print("  NO PC DO TELAO, abra no navegador:")
    if ips:
        for ip in ips:
            nota = "   (cabo de rede direto entre os PCs)" if is_direct(ip) else ""
            print(f"      http://{ip}:{port}/{nota}")
    else:
        print("      (nenhuma rede encontrada - conecte este PC ao Wi-Fi/cabo)")
    print()
    print("  Deixe esta janela ABERTA durante a competicao.")
    print("  Para desligar: feche esta janela (ou Ctrl+C).")
    print(f"  Backup automatico: {DATA_FILE}")
    print(line)
    threading.Timer(0.8, lambda: webbrowser.open(local_url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
