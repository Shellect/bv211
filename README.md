To create "AUTH_SECRET" for the site you can use 
```shell
openssl rand -base64 60
```

Проект в разработке. 
План работы:
- Сохранение сессии в redis
- Добавить форму аутентификации
- Изменить шапку сайта