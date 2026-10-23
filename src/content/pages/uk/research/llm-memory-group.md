---
title: "Довготривала пам'ять і оцінювання великих мовних моделей"
description: "Дослідницька група кафедри комп'ютерної інженерії Керівник групи Білецький Павло Володимирович, доктор філософії з комп'ютерної інженерії, асистент кафедри…"
legacy: "/research/llm-memory-group/"
source: "pages/research/llm-memory-group.rst"
---

*Дослідницька група кафедри комп'ютерної інженерії*

## Керівник групи

[Білецький Павло Володимирович](/personas/biletskyi/), доктор філософії з комп'ютерної інженерії, асистент кафедри комп'ютерної інженерії.

## Склад

- Чепель Леонід Валерійович — доктор філософії; відповідальний виконавець проекту
- студенти-дипломники ОПП «Інженерія комп'ютерних систем і мереж» (див. перелік робіт нижче)

## Напрям досліджень

Група досліджує методи розширення контекстного вікна великих мовних моделей за рахунок зовнішньої довготривалої пам'яті. Розглядаються блокова організація збереженої інформації з багаторівневим доступом, вибіркове запам'ятовування лише нової відносно вже засвоєних знань інформації та асинхронне керування пам'яттю окремим фоновим процесом. Наукова новизна полягає у створенні персистентної багаторівневої блокової пам'яті поза контекстним вікном, яка донавчається поверх готових відкритих моделей методами параметрично-ефективного донавчання, без зміни їхніх ваг і без навчання моделі з нуля.

Другий напрям роботи групи — методологія чесного оцінювання мовних моделей: розроблення україномовних бенчмарків, ізоляція внеску пам'яті від внеску контекстного вікна, протоколи без лексичного перетину запитання й тексту.

Дослідження виконуються на відкритих моделях родин Gemma і Qwen із використанням графічних прискорювачів.

## Проект

«Розробка масштабованої архітектури довготривалої пам'яті великих мовних моделей для обробки наддовгих контекстів». Науковий керівник — П. В. Білецький. Подано на конкурс проектів молодих учених МОН України (2026), запропоновані терміни виконання 01.01.2027 — 31.12.2028. Заявка на розгляді.

## Кваліфікаційні роботи, виконані в межах напряму

**2026**

- Антонюк І. В. «Інтелектуальний асистент для текстового процесора на основі хмарних та локальних великих мовних моделей» — [репозиторій проекту](https://github.com/IrinaAntonuk/word-get-started-with-dev-kit)
- Кулік А. К. «Розробка програмної системи з обробкою недетермінованих елементів за допомогою LLM-агентів для автоматизованого аналізу та оцінки NPL-портфелів»
- Міхненко В. М. «Розробка системи ретрансляції відеопотоків з інструментами моніторингу та діагностики»
- Пальчук А. М. «Розробка комплексного бенчмарку для оцінювання якості роботи великих мовних моделей з українською мовою»
- Соловей О. С. «Розробка інтелектуального асистента для табличних процесорів на основі відкритих великих мовних моделей» — [репозиторій проекту](https://github.com/soloveyOlexandr/Solovei-Diplom)
- Тищенко Є. В. «Розробка навчального набору даних для системи внутрішньої пам'яті великих мовних моделей»

**2025**

- Хімін Р. О. «Покращення продуктивності великих мовних моделей для роботи з задачами українською мовою»

## Research group: long-term memory and evaluation of large language models

**Group lead:** [Pavlo Biletskyi](/personas/biletskyi/), PhD in Computer Engineering, Department of Computer Engineering, Faculty of Radiophysics, Electronics and Computer Systems, Taras Shevchenko National University of Kyiv.

**Members:** Leonid Chepel, PhD (co-investigator); undergraduate students working on their qualification theses.

The group studies methods for extending the context window of large language models through external long-term memory: block-based organisation of stored information with multi-tier access, selective memorisation of information that is new relative to already acquired knowledge, and asynchronous memory management by a separate background process. The scientific novelty lies in a persistent multi-tier block memory outside the context window, fine-tuned on top of existing open models with parameter-efficient methods, without changing their weights and without training a model from scratch.

A second line of work concerns honest evaluation: Ukrainian-language benchmarks for LLMs, isolating the contribution of memory from that of the context window, and evaluation protocols without literal lexical overlap between question and text.

**Project:** *"Development of a scalable long-term memory architecture for large language models to process ultra-long contexts"*, principal investigator P. Biletskyi, submitted to the young-researcher competition of the Ministry of Education and Science of Ukraine (2026); proposed term 1 January 2027 — 31 December 2028; currently under review.

**Supervised bachelor's theses, 2025–2026:**

- I. Antoniuk, *An intelligent assistant for a word processor based on cloud and local large language models* (2026) — [repository](https://github.com/IrinaAntonuk/word-get-started-with-dev-kit)
- A. Kulik, *A software system with LLM-agent processing of non-deterministic elements for automated analysis and valuation of NPL portfolios* (2026)
- V. Mikhnenko, *A video stream relay system with monitoring and diagnostic tooling* (2026)
- A. Palchuk, *A comprehensive benchmark for evaluating the performance of large language models in Ukrainian* (2026)
- O. Solovei, *An intelligent assistant for spreadsheet applications based on open large language models* (2026) — [repository](https://github.com/soloveyOlexandr/Solovei-Diplom)
- Ye. Tyshchenko, *A training dataset for an internal memory system of large language models* (2026)
- R. Khimin, *Improving the performance of large language models on Ukrainian-language tasks* (2025)
