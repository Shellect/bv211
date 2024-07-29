# Express application example

###### Учебный проект, демонстрирующий использование JS на сервере

---

Все действия в руководстве приведены для Ubuntu.

Используемые библиотеки и технологии
- Express
- Pug
- MongoDB
- Redis

Необходимые программы:
- Git
- Docker

---

 Клонируйте этот репозиторий:
```git clone git@github.com:Shellect/express-example.git```

---

Для генерации `AUTH_SECRET` используйте команду
```shell
openssl rand -base64 60
```
___

Запустите контейнеры 
``docker compose up``
Перейдите по адресу http://localhost:3000