# GitLab MCP Server

GitLab MCP — сервер Model Context Protocol, который предоставляет инструменты для работы с проектами GitLab, merge-request'ами и тегами непосредственно из Claude Code, Code CLI и других MCP-клиентов.

## Возможности

- Получение списка доступных проектов GitLab и подробной информации по каждому проекту.
- Просмотр тегов репозитория с расчётом следующего релизного тега по SemVer.
- Списки merge-request'ов с фильтрами по состоянию и дате обновления.
- Детальная информация о merge-request'ах с флагом «свежести» (смерджено менее 24 часов назад).
- Поиск по merge-request'ам (название и описание).

## Установка

    npm install
    npm run build

## Запуск сервера

Обмен данными происходит через stdio:

    node dist/index.js

Подключите сервер в MCP-клиенте (Code CLI, Claude Code и т. д.) через секцию `mcpServers`.

## MCP-инструменты

| Инструмент | Описание |
| --- | --- |
| `service_info` | Статус подключения к GitLab и активные фильтры. |
| `gitlab_projects` | Список доступных проектов с пагинацией и поиском. |
| `gitlab_project_details` | Подробности проекта по ID или namespace. |
| `gitlab_project_tags` | Теги проекта + подсказка следующего релизного тега. |
| `gitlab_merge_requests` | Merge-request'ы проекта с фильтрами и пагинацией. |
| `gitlab_merge_request_details` | Детали MR, включая ссылки и флаг свежести. |
| `gitlab_search` | Поиск merge-request'ов по названию и описанию. |

## Переменные окружения

| Переменная | Описание |
| --- | --- |
| `GITLAB_URL` | Базовый URL инстанса GitLab (обязательно). |
| `GITLAB_TOKEN` | Персональный токен GitLab с правами `read_api` и `read_repository` (обязательно). |

## Пример настройки MCP-клиента

    {
      "mcpServers": {
        "gitlab": {
          "command": "node",
          "args": ["/path/to/gitlab-mcp/dist/index.js"],
          "env": {
            "GITLAB_URL": "https://gitlab.example.com",
            "GITLAB_TOKEN": "glpat-..."
          }
        }
      }
    }

## Лицензия

MIT
