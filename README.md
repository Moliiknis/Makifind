# Makifind

[English](#english) · [Русский](#русский)

## English

An Adobe After Effects plug-in from the **Makimchi** set. Quick effect search and apply: type a couple of letters and press Enter, favorites, recent effects, apply on an adjustment layer.

Similar to: **FX Console (Video Copilot)**.

> Written from scratch. Not affiliated with the authors of the original plug-in and contains none of their code.

### Install

1. Download `Makifind-1.0.1-Setup.exe` from [Releases](https://github.com/Moliiknis/Makifind/releases/latest).
2. Close After Effects and run the installer. No administrator rights are needed.
3. Start After Effects and open Window > Extensions > Makifind.

Windows may show a SmartScreen warning because the installer is not code-signed: click "More info" → "Run anyway".

Works in After Effects 2021 and later.

To uninstall: **Settings → Apps → Makifind for After Effects**.

### Build from source

```powershell
.\build-installer.ps1   # builds the plug-in and release\Makifind-1.0.1-Setup.exe
```

For development the panel can be linked to the source folder with `install.ps1`.

### License

[PolyForm Noncommercial 1.0.0](LICENSE.md): free for personal and any noncommercial use, you may modify and share it. Commercial use (selling, paid client work, use in a company for profit) is not permitted by this license.

---

## Русский

Плагин для Adobe After Effects из набора **Makimchi**. Быстрый поиск и применение эффектов: пара букв и Enter, избранное, недавние, применение на корректирующий слой.

Аналог: **FX Console (Video Copilot)**.

> Собственная реализация с нуля. Не связан с авторами оригинального плагина и не содержит их кода.

### Установка

1. Нужно скачать `Makifind-1.0.1-Setup.exe` со страницы [Releases](https://github.com/Moliiknis/Makifind/releases/latest).
2. Нужно закрыть After Effects и запустить установщик. Права администратора не нужны.
3. Нужно открыть After Effects: Окно → Расширения → Makifind.

Windows может показать предупреждение SmartScreen, потому что установщик не подписан сертификатом. В этом случае нужно нажать «Подробнее» → «Выполнить в любом случае».

Работает в After Effects 2021 и новее.

Для удаления нужно открыть **Параметры → Приложения → Makifind for After Effects**.

### Сборка из исходников

```powershell
.\build-installer.ps1   # собирает плагин и release\Makifind-1.0.1-Setup.exe
```

Для разработки панель можно подключить ссылкой на папку с исходниками через `install.ps1`.

### Лицензия

[PolyForm Noncommercial 1.0.0](LICENSE.md): бесплатно для личного и любого некоммерческого использования, можно изменять и делиться. Коммерческое использование (продажа, платные заказы, использование в компании ради прибыли) этой лицензией не разрешено.
