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
# Sessao Extras para o telao (so quando o operador escolhe "Sessao Extras" no telao).
# Fica so na memoria, separada dos dados oficiais: nao vai para o dados-competicao.json.
extras_store = {"extras": None}
# Juizes pelo celular: cada toque vira um comando pequeno que o PC de registro executa
# (o PC de registro continua dono dos dados). Protegido pelo PIN definido em Config.
cmd_store = {"next": 1, "cmds": [], "res": {}, "judges": {}}  # judges: nome -> ultimo contato (ms)
MAX_CMD = 64 * 1024


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

    def same_host(self):
        """Comandos dos celulares: a origem precisa ser este proprio servidor (http://IP-do-note:porta)."""
        origin = self.headers.get("Origin")
        return origin is None or origin == "http://" + str(self.headers.get("Host", ""))

    def judge_pin(self):
        with lock:
            d = store["data"] or {}
        pin = str((d.get("settings") or {}).get("judgePin") or "")
        return pin

    def read_json(self, limit):
        if not self.headers.get("Content-Type", "").startswith("application/json"):
            return None, (415, "formato invalido")
        try:
            n = int(self.headers.get("Content-Length", 0))
            if n <= 0 or n > limit:
                return None, (400, "tamanho invalido")
            return json.loads(self.rfile.read(n).decode("utf-8")), None
        except (ValueError, UnicodeDecodeError):
            return None, (400, "JSON invalido")

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/cmd":  # so o PC de registro busca os comandos
            if not self.is_local():
                return self.send_json({"erro": "proibido"}, 403)
            raw = parse_qs(url.query).get("after", ["0"])[0]
            after = int(raw) if raw.isdigit() else 0
            with lock:
                cmds = [c for c in cmd_store["cmds"] if c["id"] > after]
                judges = dict(cmd_store["judges"])
            return self.send_json({"cmds": cmds, "now": int(time.time() * 1000), "judges": judges})
        if url.path == "/api/cmd/res":
            ids = [int(x) for x in (parse_qs(url.query).get("ids", [""])[0]).split(",") if x.isdigit()][:50]
            with lock:
                res = {str(i): cmd_store["res"][i] for i in ids if i in cmd_store["res"]}
            return self.send_json({"res": res})
        if url.path == "/api/info":
            port = self.server.server_address[1]
            return self.send_json({"server": True, "local": self.is_local(), "judges": True,
                                   "urls": [f"http://{ip}:{port}/" for ip in lan_ips()]})
        if url.path == "/api/estado":
            since = parse_qs(url.query).get("since", [None])[0]
            with lock:
                out = {"rev": store["rev"], "now": int(time.time() * 1000)}
                if since is None or str(store["rev"]) != since:
                    data = store["data"]
                    # o PIN dos juizes nunca sai para a rede (telao e celulares)
                    if data and not self.is_local() and isinstance(data.get("settings"), dict) and "judgePin" in data["settings"]:
                        data = dict(data); data["settings"] = dict(data["settings"]); data["settings"]["judgePin"] = ""
                    out["data"] = data
                    out["extras"] = extras_store["extras"]
            return self.send_json(out)
        # nao expoe o backup, o proprio servidor nem pastas ocultas (.git etc.)
        parts = [p for p in url.path.split("/") if p]
        if url.path.startswith("/dados-competicao") or any(p.startswith(".") or p == "__pycache__" for p in parts) \
                or url.path.lower().endswith((".py", ".bat", ".tmp", ".corrompido")):
            return self.send_error(404)
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path in ("/api/cmd", "/api/juiz/login"):  # celular do juiz (qualquer PC da rede, com PIN)
            if not self.same_host():
                return self.send_json({"erro": "origem invalida"}, 403)
            p, err = self.read_json(MAX_CMD)
            if err:
                return self.send_json({"erro": err[1]}, err[0])
            pin = self.judge_pin()
            if not pin or str(p.get("pin", "")) != pin:
                return self.send_json({"erro": "PIN invalido ou juizes desligados"}, 401)
            with lock:
                name = str(p.get("judge", ""))[:40] or "Juiz"
                cmd_store["judges"][name] = int(time.time() * 1000)
                if len(cmd_store["judges"]) > 50:
                    for k in sorted(cmd_store["judges"], key=cmd_store["judges"].get)[:-50]:
                        del cmd_store["judges"][k]
            if path == "/api/juiz/login":
                return self.send_json({"ok": True})
            fn, args = p.get("fn"), p.get("args", [])
            if not isinstance(fn, str) or len(fn) > 40 or not isinstance(args, list):
                return self.send_json({"erro": "comando invalido"}, 400)
            with lock:
                cid = cmd_store["next"]; cmd_store["next"] += 1
                cmd_store["cmds"].append({"id": cid, "t": int(time.time() * 1000), "judge": str(p.get("judge", ""))[:40], "fn": fn, "args": args,
                                          "answers": p.get("answers", []) if isinstance(p.get("answers"), list) else [], "review": p.get("review")})
                cmd_store["cmds"] = cmd_store["cmds"][-500:]
            return self.send_json({"id": cid})
        if path == "/api/cmd/done":  # PC de registro confirma o comando executado
            if not self.is_local() or not self.same_origin():
                return self.send_json({"erro": "proibido"}, 403)
            p, err = self.read_json(MAX_CMD)
            if err:
                return self.send_json({"erro": err[1]}, err[0])
            with lock:
                for r in (p.get("done") or []):
                    if isinstance(r, dict) and isinstance(r.get("id"), int):
                        cmd_store["res"][r["id"]] = {"ok": bool(r.get("ok")), "msgs": [str(m)[:200] for m in (r.get("msgs") or [])][:5]}
                        cmd_store["cmds"] = [c for c in cmd_store["cmds"] if c["id"] != r["id"]]
                if len(cmd_store["res"]) > 1000:
                    for k in sorted(cmd_store["res"])[:-500]:
                        del cmd_store["res"][k]
            return self.send_json({"ok": True})
        if path != "/api/estado":
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
            extras = payload.get("extras")
        except (ValueError, UnicodeDecodeError):
            return self.send_json({"erro": "JSON invalido"}, 400)
        with lock:
            store["rev"] += 1
            store["data"] = data
            extras_store["extras"] = extras if isinstance(extras, dict) else None
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
    print("  JUIZES PELO CELULAR (mesma rede, PIN em Config.):")
    for ip in ips:
        print(f"      http://{ip}:{port}/#juiz")
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
