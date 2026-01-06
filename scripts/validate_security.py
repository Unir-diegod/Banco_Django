"""
Script de validación de configuración de seguridad
"""
import os
import sys
import re
from pathlib import Path


def check_security_config():
    """Valida configuración de seguridad del proyecto"""
    
    workspace = Path(__file__).parent.parent
    issues = []
    warnings = []
    passed = []
    
    print("🔐 AUDITORÍA DE SEGURIDAD\n" + "="*60)
    
    # 1. Verificar .gitignore contiene .env
    gitignore_path = workspace / ".gitignore"
    if gitignore_path.exists():
        content = gitignore_path.read_text()
        if ".env" in content and "*.env" in content:
            passed.append("✅ .env está en .gitignore")
        else:
            issues.append("❌ CRÍTICO: .env NO está en .gitignore")
    else:
        issues.append("❌ CRÍTICO: .gitignore no existe")
    
    # 2. Verificar que .env no está en Git
    env_file = workspace / ".env"
    if env_file.exists():
        import subprocess
        try:
            result = subprocess.run(
                ["git", "ls-files", ".env"],
                cwd=workspace,
                capture_output=True,
                text=True
            )
            if result.stdout.strip():
                issues.append("❌ CRÍTICO: .env está trackeado en Git!")
            else:
                passed.append("✅ .env NO está en Git")
        except:
            warnings.append("⚠️  No se pudo verificar Git")
    
    # 3. Verificar SECRET_KEY
    if env_file.exists():
        content = env_file.read_text()
        if re.search(r'DJANGO_SECRET_KEY=dev-only|change-me', content):
            issues.append("❌ CRÍTICO: SECRET_KEY usa valor de ejemplo")
        elif re.search(r'DJANGO_SECRET_KEY=.{50,}', content):
            passed.append("✅ SECRET_KEY tiene longitud adecuada")
        else:
            warnings.append("⚠️  SECRET_KEY parece corto (< 50 chars)")
    
    # 4. Verificar DEBUG en producción
    if env_file.exists():
        content = env_file.read_text()
        debug_match = re.search(r'DJANGO_DEBUG=(\d)', content)
        if debug_match:
            if debug_match.group(1) == "0":
                passed.append("✅ DEBUG=0 (producción)")
            else:
                warnings.append("⚠️  DEBUG=1 (solo para desarrollo)")
    
    # 5. Buscar credenciales hardcodeadas en scripts
    scripts_dir = workspace / "scripts"
    if scripts_dir.exists():
        found_hardcoded = False
        for script_file in scripts_dir.glob("*.ps1"):
            try:
                content = script_file.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                try:
                    content = script_file.read_text(encoding='latin-1')
                except:
                    continue  # Skip archivos con encoding problemático
            
            # Buscar patrones de password hardcodeado
            if re.search(r'\$\w*password\s*=\s*[\'"][^\'"\$]+[\'"]', content, re.I):
                if "$env:" not in content[:500]:  # Si no usa variables de entorno al inicio
                    issues.append(f"❌ CRÍTICO: Credenciales hardcodeadas en {script_file.name}")
                    found_hardcoded = True
        
        if not found_hardcoded:
            passed.append("✅ No hay credenciales hardcodeadas en scripts")
    
    # 6. Verificar CORS configuration
    if env_file.exists():
        content = env_file.read_text()
        if "localhost" in content or "127.0.0.1" in content:
            warnings.append("⚠️  CORS permite localhost (solo desarrollo)")
        
        if re.search(r'DJANGO_CORS_ALLOWED_ORIGINS=.*https://', content):
            passed.append("✅ CORS configurado con HTTPS")
    
    # 7. Verificar SSL redirect
    if env_file.exists():
        content = env_file.read_text()
        if re.search(r'DJANGO_SECURE_SSL_REDIRECT=1', content):
            passed.append("✅ SSL redirect habilitado")
        else:
            warnings.append("⚠️  SSL redirect deshabilitado (solo desarrollo)")
    
    # 8. Verificar passwords débiles conocidos
    weak_passwords = ["123", "admin", "test", "demo", "root"]
    if env_file.exists():
        content = env_file.read_text()
        # Buscar solo en valores de variables, no en nombres de claves
        for line in content.split('\n'):
            if '=' in line and not line.strip().startswith('#'):
                key, value = line.split('=', 1)
                value_lower = value.lower()
                for weak in weak_passwords:
                    if weak in value_lower and len(value) < 20:  # Solo si el password es corto
                        issues.append(f"❌ CRÍTICO: Password débil detectado ('{weak}' en {key})")
    
    # Mostrar resultados
    print("\n✅ VERIFICACIONES PASADAS:")
    for p in passed:
        print(f"  {p}")
    
    if warnings:
        print("\n⚠️  ADVERTENCIAS:")
        for w in warnings:
            print(f"  {w}")
    
    if issues:
        print("\n❌ PROBLEMAS CRÍTICOS:")
        for i in issues:
            print(f"  {i}")
    
    print("\n" + "="*60)
    print(f"Total: {len(passed)} pasadas | {len(warnings)} advertencias | {len(issues)} críticos")
    
    # Recomendaciones
    if issues:
        print("\n🔧 ACCIONES REQUERIDAS:")
        print("  1. Ejecutar: python loan_system/manage.py generate_secrets --all")
        print("  2. Actualizar .env con credenciales generadas")
        print("  3. Verificar que .env está en .gitignore")
        print("  4. Nunca commitear .env al repositorio")
        return 1
    elif warnings:
        print("\n⚠️  Configuración para DESARROLLO - OK")
        print("  Para producción, revisar SEGURIDAD_CREDENCIALES.md")
        return 0
    else:
        print("\n🎉 Configuración de seguridad EXCELENTE!")
        return 0


if __name__ == "__main__":
    sys.exit(check_security_config())
