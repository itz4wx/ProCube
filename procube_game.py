#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ProCube - Премиум 3D Кубик Рубика на Python
Версия: 2.0
Автор: ProCube Team
Описание: Интерактивная 3D игра Кубик Рубика с красивой графикой и геймификацией
"""

import pygame
import math
import random
import json
import os
from datetime import datetime
from typing import List, Tuple, Dict, Optional
import sys

# Инициализация Pygame
pygame.init()

# Константы игры
WINDOW_WIDTH = 1200
WINDOW_HEIGHT = 800
FPS = 60

# Цвета кубика
COLORS = {
    'white': (255, 255, 255),
    'yellow': (255, 255, 0),
    'red': (255, 0, 0),
    'orange': (255, 165, 0),
    'blue': (0, 0, 255),
    'green': (0, 255, 0),
    'black': (20, 20, 20),
    'dark_gray': (40, 40, 40),
    'light_gray': (200, 200, 200),
    'gold': (255, 215, 0),
    'cyan': (0, 255, 255),
    'purple': (128, 0, 128),
}

# Цвета интерфейса
UI_COLORS = {
    'primary_blue': (0, 102, 255),
    'dark_blue': (0, 34, 102),
    'light_blue': (51, 153, 255),
    'accent_blue': (0, 170, 255),
    'background': (0, 17, 34),
    'card_bg': (0, 0, 0, 50),
    'text_white': (255, 255, 255),
    'text_gold': (255, 215, 0),
    'success': (0, 255, 136),
    'warning': (255, 170, 0),
    'danger': (255, 68, 68),
}


class Vector3:
    """3D вектор для математических операций"""
    
    def __init__(self, x=0, y=0, z=0):
        self.x = x
        self.y = y
        self.z = z
    
    def __add__(self, other):
        return Vector3(self.x + other.x, self.y + other.y, self.z + other.z)
    
    def __sub__(self, other):
        return Vector3(self.x - other.x, self.y - other.y, self.z - other.z)
    
    def __mul__(self, scalar):
        return Vector3(self.x * scalar, self.y * scalar, self.z * scalar)
    
    def rotate_x(self, angle):
        """Поворот вокруг оси X"""
        cos_a, sin_a = math.cos(angle), math.sin(angle)
        return Vector3(
            self.x,
            self.y * cos_a - self.z * sin_a,
            self.y * sin_a + self.z * cos_a
        )
    
    def rotate_y(self, angle):
        """Поворот вокруг оси Y"""
        cos_a, sin_a = math.cos(angle), math.sin(angle)
        return Vector3(
            self.x * cos_a + self.z * sin_a,
            self.y,
            -self.x * sin_a + self.z * cos_a
        )
    
    def rotate_z(self, angle):
        """Поворот вокруг оси Z"""
        cos_a, sin_a = math.cos(angle), math.sin(angle)
        return Vector3(
            self.x * cos_a - self.y * sin_a,
            self.x * sin_a + self.y * cos_a,
            self.z
        )


class Cubelet:
    """Маленький кубик (часть большого кубика)"""
    
    def __init__(self, x, y, z, size=30):
        self.original_pos = Vector3(x, y, z)
        self.current_pos = Vector3(x, y, z)
        self.size = size
        self.colors = {
            'front': COLORS['black'],
            'back': COLORS['black'],
            'left': COLORS['black'],
            'right': COLORS['black'],
            'top': COLORS['black'],
            'bottom': COLORS['black']
        }
        self.rotation = Vector3(0, 0, 0)
        
    def get_screen_pos(self, camera_rotation, perspective_scale=400):
        """Получить экранные координаты с учетом камеры"""
        # Применяем поворот камеры
        pos = Vector3(self.current_pos.x, self.current_pos.y, self.current_pos.z)
        pos = pos.rotate_x(camera_rotation.x)
        pos = pos.rotate_y(camera_rotation.y)
        pos = pos.rotate_z(camera_rotation.z)
        
        # Простейшая 3D проекция
        screen_x = WINDOW_WIDTH // 2 + pos.x * 4
        screen_y = WINDOW_HEIGHT // 2 - pos.y * 4 - pos.z * 2
        
        return int(screen_x), int(screen_y)
    
    def draw_face(self, screen, camera_rotation, face_name, color):
        """Отрисовка одной грани кубика"""
        center_x, center_y = self.get_screen_pos(camera_rotation)
        half_size = self.size // 2
        
        # Определяем углы грани
        corners = []
        if face_name == 'front':
            corners = [
                (center_x - half_size, center_y - half_size),
                (center_x + half_size, center_y - half_size),
                (center_x + half_size, center_y + half_size),
                (center_x - half_size, center_y + half_size)
            ]
        elif face_name == 'top':
            corners = [
                (center_x - half_size, center_y - half_size),
                (center_x + half_size, center_y - half_size),
                (center_x + half_size - 10, center_y - half_size - 10),
                (center_x - half_size - 10, center_y - half_size - 10)
            ]
        elif face_name == 'right':
            corners = [
                (center_x + half_size, center_y - half_size),
                (center_x + half_size + 10, center_y - half_size - 10),
                (center_x + half_size + 10, center_y + half_size - 10),
                (center_x + half_size, center_y + half_size)
            ]
        
        if corners:
            pygame.draw.polygon(screen, color, corners)
            pygame.draw.polygon(screen, (0, 0, 0), corners, 2)


class RubiksCube:
    """Основной класс кубика Рубика"""
    
    def __init__(self):
        self.cubelets = []
        self.camera_rotation = Vector3(0.3, 0.3, 0)
        self.is_rotating = False
        self.rotation_progress = 0
        self.rotation_axis = None
        self.rotation_layer = None
        self.rotation_direction = 1
        self.animation_speed = 5
        
        self.create_cube()
        self.color_cube()
    
    def create_cube(self):
        """Создание 3x3x3 кубика"""
        self.cubelets = []
        size = 35
        spacing = size + 5
        
        for x in range(-1, 2):
            for y in range(-1, 2):
                for z in range(-1, 2):
                    cubelet = Cubelet(x * spacing, y * spacing, z * spacing, size)
                    self.cubelets.append(cubelet)
    
    def color_cube(self):
        """Раскраска кубика в правильные цвета"""
        for cubelet in self.cubelets:
            x, y, z = cubelet.current_pos.x, cubelet.current_pos.y, cubelet.current_pos.z
            
            # Определяем какие грани видимые
            if x > 0:  # Правая грань
                cubelet.colors['right'] = COLORS['red']
            if x < 0:  # Левая грань
                cubelet.colors['left'] = COLORS['orange']
            if y > 0:  # Верхняя грань
                cubelet.colors['top'] = COLORS['white']
            if y < 0:  # Нижняя грань
                cubelet.colors['bottom'] = COLORS['yellow']
            if z > 0:  # Передняя грань
                cubelet.colors['front'] = COLORS['green']
            if z < 0:  # Задняя грань
                cubelet.colors['back'] = COLORS['blue']
    
    def rotate_face(self, face, clockwise=True):
        """Поворот грани кубика"""
        if self.is_rotating:
            return
        
        self.is_rotating = True
        self.rotation_progress = 0
        self.rotation_direction = 1 if clockwise else -1
        
        if face == 'R':
            self.rotation_axis = 'x'
            self.rotation_layer = max(c.current_pos.x for c in self.cubelets)
        elif face == 'L':
            self.rotation_axis = 'x'
            self.rotation_layer = min(c.current_pos.x for c in self.cubelets)
            self.rotation_direction *= -1
        elif face == 'U':
            self.rotation_axis = 'y'
            self.rotation_layer = max(c.current_pos.y for c in self.cubelets)
        elif face == 'D':
            self.rotation_axis = 'y'
            self.rotation_layer = min(c.current_pos.y for c in self.cubelets)
            self.rotation_direction *= -1
        elif face == 'F':
            self.rotation_axis = 'z'
            self.rotation_layer = max(c.current_pos.z for c in self.cubelets)
        elif face == 'B':
            self.rotation_axis = 'z'
            self.rotation_layer = min(c.current_pos.z for c in self.cubelets)
            self.rotation_direction *= -1
    
    def update_rotation(self):
        """Обновление анимации поворота"""
        if not self.is_rotating:
            return
        
        self.rotation_progress += self.animation_speed
        
        if self.rotation_progress >= 90:
            self.complete_rotation()
            self.is_rotating = False
            self.rotation_progress = 0
    
    def complete_rotation(self):
        """Завершение поворота - обновление позиций кубиков"""
        affected_cubelets = []
        
        for cubelet in self.cubelets:
            if self.rotation_axis == 'x' and abs(cubelet.current_pos.x - self.rotation_layer) < 10:
                affected_cubelets.append(cubelet)
            elif self.rotation_axis == 'y' and abs(cubelet.current_pos.y - self.rotation_layer) < 10:
                affected_cubelets.append(cubelet)
            elif self.rotation_axis == 'z' and abs(cubelet.current_pos.z - self.rotation_layer) < 10:
                affected_cubelets.append(cubelet)
        
        # Обновляем позиции кубиков после поворота
        for cubelet in affected_cubelets:
            if self.rotation_axis == 'x':
                old_y, old_z = cubelet.current_pos.y, cubelet.current_pos.z
                if self.rotation_direction > 0:
                    cubelet.current_pos.y = old_z
                    cubelet.current_pos.z = -old_y
                else:
                    cubelet.current_pos.y = -old_z
                    cubelet.current_pos.z = old_y
            elif self.rotation_axis == 'y':
                old_x, old_z = cubelet.current_pos.x, cubelet.current_pos.z
                if self.rotation_direction > 0:
                    cubelet.current_pos.x = -old_z
                    cubelet.current_pos.z = old_x
                else:
                    cubelet.current_pos.x = old_z
                    cubelet.current_pos.z = -old_x
            elif self.rotation_axis == 'z':
                old_x, old_y = cubelet.current_pos.x, cubelet.current_pos.y
                if self.rotation_direction > 0:
                    cubelet.current_pos.x = old_y
                    cubelet.current_pos.y = -old_x
                else:
                    cubelet.current_pos.x = -old_y
                    cubelet.current_pos.y = old_x
    
    def shuffle(self, moves=25):
        """Перемешивание кубика"""
        faces = ['R', 'L', 'U', 'D', 'F', 'B']
        for _ in range(moves):
            face = random.choice(faces)
            clockwise = random.choice([True, False])
            self.rotate_face(face, clockwise)
            # Мгновенно применяем поворот для перемешивания
            if self.is_rotating:
                self.complete_rotation()
                self.is_rotating = False
    
    def reset(self):
        """Сброс кубика в начальное состояние"""
        self.create_cube()
        self.color_cube()
    
    def is_solved(self):
        """Проверка решен ли кубик"""
        # Упрощенная проверка - просто возвращаем False для демо
        return False
    
    def draw(self, screen):
        """Отрисовка кубика"""
        # Сортируем кубики по глубине для правильной отрисовки
        cubelets_sorted = sorted(self.cubelets, 
                               key=lambda c: -(c.current_pos.x + c.current_pos.y + c.current_pos.z))
        
        for cubelet in cubelets_sorted:
            # Рисуем видимые грани
            cubelet.draw_face(screen, self.camera_rotation, 'front', cubelet.colors['front'])
            cubelet.draw_face(screen, self.camera_rotation, 'top', cubelet.colors['top'])
            cubelet.draw_face(screen, self.camera_rotation, 'right', cubelet.colors['right'])


class GameUI:
    """Пользовательский интерфейс игры"""
    
    def __init__(self):
        self.font_large = pygame.font.Font(None, 48)
        self.font_medium = pygame.font.Font(None, 32)
        self.font_small = pygame.font.Font(None, 24)
        
        # Игровые данные
        self.level = self.load_data('level', 1)
        self.coins = self.load_data('coins', 0)
        self.moves = 0
        self.best_moves = self.load_data('best_moves', 999)
        self.best_time = self.load_data('best_time', '00:00')
        self.start_time = None
        self.game_time = 0
        
        # Кнопки
        self.buttons = {
            'shuffle': pygame.Rect(50, 700, 120, 50),
            'reset': pygame.Rect(180, 700, 120, 50),
            'solve': pygame.Rect(310, 700, 120, 50),
            'shop': pygame.Rect(440, 700, 120, 50)
        }
        
        self.status_message = "🎮 Добро пожаловать в ProCube!"
    
    def load_data(self, key, default):
        """Загрузка данных из файла"""
        try:
            if os.path.exists('procube_save.json'):
                with open('procube_save.json', 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get(key, default)
        except:
            pass
        return default
    
    def save_data(self):
        """Сохранение данных в файл"""
        try:
            data = {
                'level': self.level,
                'coins': self.coins,
                'best_moves': self.best_moves,
                'best_time': self.best_time
            }
            with open('procube_save.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except:
            pass
    
    def start_timer(self):
        """Запуск таймера игры"""
        if not self.start_time:
            self.start_time = pygame.time.get_ticks()
    
    def update_timer(self):
        """Обновление таймера"""
        if self.start_time:
            self.game_time = (pygame.time.get_ticks() - self.start_time) // 1000
    
    def get_time_string(self):
        """Получение времени в формате ММ:СС"""
        if self.start_time:
            minutes = self.game_time // 60
            seconds = self.game_time % 60
            return f"{minutes:02d}:{seconds:02d}"
        return "00:00"
    
    def draw_gradient_rect(self, screen, rect, color1, color2):
        """Отрисовка прямоугольника с градиентом"""
        for y in range(rect.height):
            ratio = y / rect.height
            r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
            g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
            b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
            pygame.draw.line(screen, (r, g, b), 
                           (rect.x, rect.y + y), (rect.x + rect.width, rect.y + y))
    
    def draw_button(self, screen, rect, text, base_color, hover_color, text_color, hovered=False):
        """Отрисовка красивой кнопки"""
        color = hover_color if hovered else base_color
        
        # Тень
        shadow_rect = rect.copy()
        shadow_rect.move_ip(3, 3)
        pygame.draw.rect(screen, (0, 0, 0, 100), shadow_rect, border_radius=15)
        
        # Основная кнопка
        pygame.draw.rect(screen, color, rect, border_radius=15)
        pygame.draw.rect(screen, UI_COLORS['text_white'], rect, 2, border_radius=15)
        
        # Текст
        text_surface = self.font_small.render(text, True, text_color)
        text_rect = text_surface.get_rect(center=rect.center)
        screen.blit(text_surface, text_rect)
    
    def draw_header(self, screen):
        """Отрисовка верхней панели"""
        # Фон заголовка
        header_rect = pygame.Rect(0, 0, WINDOW_WIDTH, 80)
        self.draw_gradient_rect(screen, header_rect, UI_COLORS['dark_blue'], UI_COLORS['primary_blue'])
        
        # Заголовок игры
        title_text = self.font_large.render("🎲 ProCube", True, UI_COLORS['text_gold'])
        screen.blit(title_text, (50, 20))
        
        # Уровень
        level_text = self.font_medium.render(f"Уровень: {self.level}", True, UI_COLORS['text_white'])
        screen.blit(level_text, (300, 25))
        
        # Таймер
        time_text = self.font_medium.render(f"⏱️ {self.get_time_string()}", True, UI_COLORS['text_white'])
        screen.blit(time_text, (500, 25))
        
        # Монеты
        coins_text = self.font_medium.render(f"🟨 {self.coins}", True, UI_COLORS['text_gold'])
        screen.blit(coins_text, (700, 25))
    
    def draw_stats(self, screen):
        """Отрисовка статистики"""
        stats_rect = pygame.Rect(850, 100, 300, 400)
        self.draw_gradient_rect(screen, stats_rect, (0, 0, 0, 150), (0, 34, 102, 150))
        pygame.draw.rect(screen, UI_COLORS['primary_blue'], stats_rect, 2, border_radius=10)
        
        y_offset = stats_rect.y + 20
        
        # Заголовок статистики
        stats_title = self.font_medium.render("📊 Статистика", True, UI_COLORS['text_gold'])
        screen.blit(stats_title, (stats_rect.x + 20, y_offset))
        y_offset += 50
        
        # Текущие ходы
        moves_text = self.font_small.render(f"Ходы: {self.moves}", True, UI_COLORS['text_white'])
        screen.blit(moves_text, (stats_rect.x + 20, y_offset))
        y_offset += 30
        
        # Лучший результат
        best_moves_text = self.font_small.render(f"Рекорд: {self.best_moves if self.best_moves < 999 else '∞'}", 
                                               True, UI_COLORS['text_white'])
        screen.blit(best_moves_text, (stats_rect.x + 20, y_offset))
        y_offset += 30
        
        # Лучшее время
        best_time_text = self.font_small.render(f"Лучшее время: {self.best_time}", 
                                              True, UI_COLORS['text_white'])
        screen.blit(best_time_text, (stats_rect.x + 20, y_offset))
        y_offset += 50
        
        # Статус игры
        status_lines = self.status_message.split('\n')
        for line in status_lines:
            status_text = self.font_small.render(line, True, UI_COLORS['accent_blue'])
            screen.blit(status_text, (stats_rect.x + 20, y_offset))
            y_offset += 25
    
    def draw_controls(self, screen):
        """Отрисовка панели управления"""
        controls_rect = pygame.Rect(50, 100, 300, 200)
        self.draw_gradient_rect(controls_rect, controls_rect, (0, 0, 0, 150), (0, 34, 102, 150))
        pygame.draw.rect(screen, UI_COLORS['primary_blue'], controls_rect, 2, border_radius=10)
        
        y_offset = controls_rect.y + 20
        
        # Заголовок управления
        controls_title = self.font_medium.render("🎮 Управление", True, UI_COLORS['text_gold'])
        screen.blit(controls_title, (controls_rect.x + 20, y_offset))
        y_offset += 40
        
        # Инструкции
        instructions = [
            "🖱️ Мышь: Поворот камеры",
            "R/L/U/D/F/B: Повороты граней",
            "Space: Перемешать",
            "Enter: Сброс"
        ]
        
        for instruction in instructions:
            text = self.font_small.render(instruction, True, UI_COLORS['text_white'])
            screen.blit(text, (controls_rect.x + 20, y_offset))
            y_offset += 25
    
    def draw_buttons(self, screen, mouse_pos):
        """Отрисовка кнопок управления"""
        button_configs = {
            'shuffle': ("🔀 Перемешать", UI_COLORS['primary_blue'], UI_COLORS['light_blue']),
            'reset': ("🔄 Сброс", (100, 100, 100), (150, 150, 150)),
            'solve': ("✨ Решить", UI_COLORS['success'], (0, 200, 100)),
            'shop': ("🛒 Магазин", UI_COLORS['text_gold'], (255, 200, 0))
        }
        
        for button_name, (text, base_color, hover_color) in button_configs.items():
            rect = self.buttons[button_name]
            hovered = rect.collidepoint(mouse_pos)
            self.draw_button(screen, rect, text, base_color, hover_color, 
                           UI_COLORS['text_white'], hovered)
    
    def handle_button_click(self, pos, cube):
        """Обработка нажатий на кнопки"""
        for button_name, rect in self.buttons.items():
            if rect.collidepoint(pos):
                if button_name == 'shuffle':
                    cube.shuffle()
                    self.moves = 0
                    self.start_timer()
                    self.status_message = "🔀 Кубик перемешан! Начните сборку!"
                elif button_name == 'reset':
                    cube.reset()
                    self.moves = 0
                    self.start_time = None
                    self.game_time = 0
                    self.status_message = "✨ Кубик сброшен! Готов к новой игре!"
                elif button_name == 'solve':
                    cube.reset()
                    self.status_message = "🤖 Кубик автоматически решен!"
                elif button_name == 'shop':
                    self.status_message = "🛒 Магазин скоро будет доступен!"
                return True
        return False
    
    def update_moves(self):
        """Увеличение счетчика ходов"""
        self.moves += 1
        self.start_timer()
    
    def on_cube_solved(self):
        """Обработка решения кубика"""
        # Вычисляем награды
        time_bonus = max(0, 100 - self.game_time // 6)  # Бонус за время
        move_bonus = max(0, 200 - self.moves * 2)       # Бонус за эффективность
        coins_earned = time_bonus + move_bonus + 50     # Базовая награда 50
        
        # Обновляем рекорды
        if self.moves < self.best_moves:
            self.best_moves = self.moves
        
        current_time = self.get_time_string()
        if self.best_time == '00:00' or self.game_time < self.time_to_seconds(self.best_time):
            self.best_time = current_time
        
        # Повышаем уровень и добавляем монеты
        self.level += 1
        self.coins += coins_earned
        self.save_data()
        
        self.status_message = f"🏆 ПОЗДРАВЛЯЕМ!\nУровень {self.level}!\n+{coins_earned} монет!"
    
    def time_to_seconds(self, time_str):
        """Конвертация времени в секунды"""
        try:
            minutes, seconds = map(int, time_str.split(':'))
            return minutes * 60 + seconds
        except:
            return 999999
    
    def draw(self, screen, mouse_pos):
        """Основная отрисовка UI"""
        self.update_timer()
        self.draw_header(screen)
        self.draw_stats(screen)
        self.draw_controls(screen)
        self.draw_buttons(screen, mouse_pos)


class ProCubeGame:
    """Основной класс игры"""
    
    def __init__(self):
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption("🎲 ProCube - Премиум 3D Кубик Рубика")
        self.clock = pygame.time.Clock()
        
        # Компоненты игры
        self.cube = RubiksCube()
        self.ui = GameUI()
        
        # Состояние игры
        self.running = True
        self.mouse_down = False
        self.last_mouse_pos = (0, 0)
        
        # Показать приветственное сообщение
        self.show_welcome()
    
    def show_welcome(self):
        """Показать экран приветствия"""
        welcome_rect = pygame.Rect(WINDOW_WIDTH//4, WINDOW_HEIGHT//4, 
                                 WINDOW_WIDTH//2, WINDOW_HEIGHT//2)
        
        # Отрисовка экрана приветствия
        self.screen.fill(UI_COLORS['background'])
        
        # Фон окна приветствия
        self.ui.draw_gradient_rect(self.screen, welcome_rect, 
                                 UI_COLORS['dark_blue'], UI_COLORS['primary_blue'])
        pygame.draw.rect(self.screen, UI_COLORS['text_gold'], welcome_rect, 3, border_radius=20)
        
        # Заголовок
        title = self.ui.font_large.render("🎲 ProCube", True, UI_COLORS['text_gold'])
        title_rect = title.get_rect(center=(WINDOW_WIDTH//2, welcome_rect.y + 80))
        self.screen.blit(title, title_rect)
        
        # Подзаголовок
        subtitle = self.ui.font_medium.render("Премиум 3D Кубик Рубика", True, UI_COLORS['text_white'])
        subtitle_rect = subtitle.get_rect(center=(WINDOW_WIDTH//2, welcome_rect.y + 130))
        self.screen.blit(subtitle, subtitle_rect)
        
        # Инструкции
        instructions = [
            "🎮 Управление:",
            "",
            "🖱️ Зажмите мышь и двигайте для поворота камеры",
            "⌨️ Клавиши R, L, U, D, F, B для поворотов граней",
            "🔄 Space - перемешать, Enter - сброс",
            "",
            "🏆 Соберите кубик и получите монеты и опыт!",
            "",
            "Нажмите любую клавишу для начала..."
        ]
        
        y_offset = welcome_rect.y + 180
        for instruction in instructions:
            if instruction:
                text = self.ui.font_small.render(instruction, True, UI_COLORS['text_white'])
                text_rect = text.get_rect(center=(WINDOW_WIDTH//2, y_offset))
                self.screen.blit(text, text_rect)
            y_offset += 25
        
        pygame.display.flip()
        
        # Ждем нажатия клавиши
        waiting = True
        while waiting:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                elif event.type in [pygame.KEYDOWN, pygame.MOUSEBUTTONDOWN]:
                    waiting = False
    
    def handle_events(self):
        """Обработка событий"""
        mouse_pos = pygame.mouse.get_pos()
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.ui.save_data()
                self.running = False
            
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:  # Левая кнопка мыши
                    if not self.ui.handle_button_click(mouse_pos, self.cube):
                        self.mouse_down = True
                        self.last_mouse_pos = mouse_pos
            
            elif event.type == pygame.MOUSEBUTTONUP:
                if event.button == 1:
                    self.mouse_down = False
            
            elif event.type == pygame.MOUSEMOTION:
                if self.mouse_down:
                    dx = mouse_pos[0] - self.last_mouse_pos[0]
                    dy = mouse_pos[1] - self.last_mouse_pos[1]
                    
                    # Поворот камеры
                    self.cube.camera_rotation.y += dx * 0.01
                    self.cube.camera_rotation.x += dy * 0.01
                    
                    # Ограничиваем вертикальный поворот
                    self.cube.camera_rotation.x = max(-1.5, min(1.5, self.cube.camera_rotation.x))
                    
                    self.last_mouse_pos = mouse_pos
            
            elif event.type == pygame.KEYDOWN:
                # Управление гранями кубика
                if not self.cube.is_rotating:
                    if event.key == pygame.K_r:
                        self.cube.rotate_face('R')
                        self.ui.update_moves()
                    elif event.key == pygame.K_l:
                        self.cube.rotate_face('L')
                        self.ui.update_moves()
                    elif event.key == pygame.K_u:
                        self.cube.rotate_face('U')
                        self.ui.update_moves()
                    elif event.key == pygame.K_d:
                        self.cube.rotate_face('D')
                        self.ui.update_moves()
                    elif event.key == pygame.K_f:
                        self.cube.rotate_face('F')
                        self.ui.update_moves()
                    elif event.key == pygame.K_b:
                        self.cube.rotate_face('B')
                        self.ui.update_moves()
                    elif event.key == pygame.K_SPACE:
                        self.cube.shuffle()
                        self.ui.moves = 0
                        self.ui.start_timer()
                        self.ui.status_message = "🔀 Кубик перемешан!"
                    elif event.key == pygame.K_RETURN:
                        self.cube.reset()
                        self.ui.moves = 0
                        self.ui.start_time = None
                        self.ui.game_time = 0
                        self.ui.status_message = "✨ Кубик сброшен!"
    
    def update(self):
        """Обновление игры"""
        self.cube.update_rotation()
        
        # Проверка на решение кубика
        if self.cube.is_solved() and self.ui.moves > 0:
            self.ui.on_cube_solved()
    
    def draw(self):
        """Отрисовка игры"""
        # Очистка экрана с градиентным фоном
        self.screen.fill(UI_COLORS['background'])
        
        # Рисуем красивый фон
        for y in range(WINDOW_HEIGHT):
            ratio = y / WINDOW_HEIGHT
            r = int(UI_COLORS['background'][0] * (1 - ratio * 0.5))
            g = int(UI_COLORS['background'][1] * (1 - ratio * 0.3))
            b = int(UI_COLORS['background'][2] + ratio * 30)
            pygame.draw.line(self.screen, (r, g, b), (0, y), (WINDOW_WIDTH, y))
        
        # Отрисовка кубика
        self.cube.draw(self.screen)
        
        # Отрисовка UI
        mouse_pos = pygame.mouse.get_pos()
        self.ui.draw(self.screen, mouse_pos)
        
        pygame.display.flip()
    
    def run(self):
        """Основной игровой цикл"""
        while self.running:
            self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(FPS)
        
        pygame.quit()
        sys.exit()


def main():
    """Главная функция запуска игры"""
    try:
        game = ProCubeGame()
        game.run()
    except Exception as e:
        print(f"Ошибка запуска игры: {e}")
        pygame.quit()
        sys.exit()


if __name__ == "__main__":
    main()
