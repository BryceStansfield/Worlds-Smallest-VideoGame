// Game Logic
var GlobalConfiguration = /** @class */ (function () {
    function GlobalConfiguration() {
    }
    GlobalConfiguration.game_height = 10;
    GlobalConfiguration.game_width = 15; // e.g. 5 pixels in width
    return GlobalConfiguration;
}());
// This class just exists to make Game.update_objects() a bit prettier
// A near complete copy of gameObject
var GameObjectProperties = /** @class */ (function () {
    function GameObjectProperties(x, width, height, move_direction, // x' = x + move_direction
    frames_per_move) {
        this.x = x;
        this.width = width;
        this.height = height;
        this.move_direction = move_direction;
        this.frames_per_move = frames_per_move;
    }
    return GameObjectProperties;
}());
var GameObject = /** @class */ (function () {
    function GameObject(x, y, width, height, move_direction, // x' = x + move_direction
    frames_per_move, // How often does this object move?
    frame_to_move_on // Move when frame == frame_to_move_on (mod frames_per_move)
    ) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.move_direction = move_direction;
        this.frames_per_move = frames_per_move;
        this.frame_to_move_on = frame_to_move_on;
    }
    return GameObject;
}());
var GameState;
(function (GameState) {
    GameState[GameState["Playing"] = 0] = "Playing";
    GameState[GameState["Won"] = 1] = "Won";
    GameState[GameState["Lost"] = 2] = "Lost";
})(GameState || (GameState = {}));
var MoveDirection;
(function (MoveDirection) {
    MoveDirection[MoveDirection["Up"] = 0] = "Up";
    MoveDirection[MoveDirection["Down"] = 1] = "Down";
    MoveDirection[MoveDirection["Left"] = 2] = "Left";
    MoveDirection[MoveDirection["Right"] = 3] = "Right";
    MoveDirection[MoveDirection["None"] = 4] = "None";
})(MoveDirection || (MoveDirection = {}));
var Game = /** @class */ (function () {
    function Game() {
        // Game State
        this.state = GameState.Playing;
        this.frame_num = 0;
        this.frog_position = [(GlobalConfiguration.game_width - 1) / 2, GlobalConfiguration.game_height - 1];
        this.obstacles = [new GameObject(1, GlobalConfiguration.game_height - 3, 2, 1, 1, 10, 0)];
        this.platforms = [new GameObject(4, 3, 2, 2, 1, 10, 2)];
    }
    // Frog Movement
    Game.prototype.step = function (move_direction) {
        // Frog Movement
        if (this.state != GameState.Playing) {
            return;
        }
        this.frame_num += 1;
        this.move_frog(move_direction);
        this.update_objects();
        this.bind_frog_to_screen();
        // Win/Lose Conditions
        if (this.has_frog_died()) {
            this.state = GameState.Lost;
        }
        if (this.has_frog_won()) {
            this.state = GameState.Won;
        }
    };
    Game.prototype.has_frog_died = function () {
        // Safe rows
        if (this.frog_position[1] == 0 || this.frog_position[1] == GlobalConfiguration.game_height - 1 || this.frog_position[1] == Game.middle_safe_zone) {
            return false;
        }
        if (this.frog_position[1] >= Game.middle_safe_zone) { // Obstacle Rows:
            for (var i = 0; i < this.obstacles.length; i += 1) {
                if (this.does_frog_overlap_object(this.obstacles[i])) {
                    return true;
                }
            }
            return false;
        }
        else { // Platform Rows:
            for (var i = 0; i < this.platforms.length; i += 1) {
                if (this.does_frog_overlap_object(this.platforms[i])) {
                    return false;
                }
            }
            return true;
        }
    };
    Game.prototype.has_frog_won = function () {
        return this.frog_position[1] == 0;
    };
    Game.prototype.move_frog = function (move_direction) {
        switch (move_direction) {
            case MoveDirection.Up:
                this.frog_position[1] -= 1;
                break;
            case MoveDirection.Down:
                this.frog_position[1] += 1;
                break;
            case MoveDirection.Left:
                this.frog_position[0] -= 1;
                break;
            case MoveDirection.Right:
                this.frog_position[0] += 1;
                break;
        }
    };
    Game.prototype.bind_frog_to_screen = function () {
        this.frog_position[0] = Math.min(GlobalConfiguration.game_width - 1, Math.max(0, this.frog_position[0]));
        this.frog_position[1] = Math.min(GlobalConfiguration.game_height - 1, Math.max(0, this.frog_position[1]));
    };
    Game.prototype.does_frog_overlap_object = function (obj) {
        return (this.frog_position[0] >= obj.x) && (this.frog_position[0] <= (obj.x + (obj.width - 1)))
            && (this.frog_position[1] >= obj.y) && (this.frog_position[1] <= (obj.y + (obj.height - 1)));
    };
    // Object movement
    Game.prototype.update_objects = function () {
        var moveObjFunction = function (gameObject) {
            if (this.frame_num % gameObject.frames_per_move == gameObject.frame_to_move_on) {
                if (this.does_frog_overlap_object(gameObject)) {
                    this.frog_position[0] += gameObject.move_direction;
                }
                gameObject.x += gameObject.move_direction;
            }
        }.bind(this);
        this.obstacles.forEach(moveObjFunction);
        this.platforms.forEach(moveObjFunction);
        // Filtering out dead gameobjects
        var deadObjFilter = function (gameObject) {
            if (gameObject.x >= GlobalConfiguration.game_width) {
                return false;
            }
            else if (gameObject.x + gameObject.width < 0) {
                return false;
            }
            else {
                return true;
            }
        };
        this.obstacles.filter(deadObjFilter);
        this.platforms.filter(deadObjFilter);
        // And spawning new ones
        // NOTE: This code is a bit janky, and platforms/objects can spawn on top of eachother. I might fix this in the future
        var obstacle_spawn_probs = [0.01, 0.01, 0.01];
        var obstacle_spawn_attributes = [new GameObjectProperties(-2, 3, 1, 1, 8),
            new GameObjectProperties(GlobalConfiguration.game_width - 1, 2, 1, -1, 12),
            new GameObjectProperties(-1, 2, 1, 1, 12)];
        var platform_spawn_probs = [0.01, 0.01, 0.01];
        var platform_spawn_attributes = [new GameObjectProperties(-2, 3, 1, 1, 8),
            new GameObjectProperties(GlobalConfiguration.game_width - 1, 2, 1, -1, 12),
            new GameObjectProperties(-1, 2, 2, 1, 12)];
        for (var yp = 0; yp < 3; yp += 1) {
            if (Math.random() <= obstacle_spawn_probs[yp]) {
                var obs = obstacle_spawn_attributes[yp];
                this.obstacles.push(new GameObject(obs.x, Game.middle_safe_zone + 1 + yp, obs.width, obs.height, obs.move_direction, obs.frames_per_move, this.frame_num % obs.frames_per_move));
            }
            if (Math.random() <= platform_spawn_probs[yp]) {
                var plat = platform_spawn_attributes[yp];
                this.platforms.push(new GameObject(plat.x, 1 + yp, plat.width, plat.height, plat.move_direction, plat.frames_per_move, this.frame_num % plat.frames_per_move));
            }
        }
    };
    // Board properties
    Game.middle_safe_zone = 5;
    return Game;
}());
var Renderer = /** @class */ (function () {
    function Renderer() {
        // Canvas Setup
        var real_canvas = document.getElementById('real_game_canvas');
        if (real_canvas != null) {
            real_canvas.height = Renderer.real_canvas_height;
            real_canvas.width = Renderer.real_canvas_width;
            this.real_context = real_canvas.getContext("2d");
        }
        var simulator_canvas = document.getElementById('simulated_game_canvas');
        if (simulator_canvas != null) {
            simulator_canvas.height = Renderer.real_canvas_height * Renderer.simulator_canvas_scale;
            simulator_canvas.width = Renderer.real_canvas_width * Renderer.simulator_canvas_scale;
            this.simulator_context = simulator_canvas.getContext("2d");
        }
        this.initialize_display(Renderer.real_canvas_height, Renderer.real_canvas_width);
    }
    // Display logic
    Renderer.prototype.initialize_display = function (height, width) {
        // I wish typescript had list comprehension :'(
        var display = [];
        for (var i = 0; i < height; i += 1) {
            var row = [];
            for (var j = 0; j < width; j += 1) {
                row.push([true, j % 3 >= 1, j % 3 >= 2]); // Test stripes
            }
            display.push(row);
        }
        this.display = display;
    };
    // Buffer operations
    Renderer.prototype.black_out_display_buffer = function () {
        for (var _i = 0, _a = this.display; _i < _a.length; _i++) {
            var row = _a[_i];
            for (var x = 0; x < row.length; x += 1) {
                row[x] = [false, false, false];
            }
        }
    };
    Renderer.prototype.replace_subpixel = function (pixel, index, new_state) {
        var new_pixel = pixel;
        new_pixel[index] = new_state;
        return new_pixel;
    };
    Renderer.prototype.swap_subpixel = function (x, y) {
        var display_x = Math.floor(x / 3);
        var pixel = this.display[y][display_x];
        this.display[y][display_x] = this.replace_subpixel(pixel, x % 3, !pixel[x % 3]);
    };
    Renderer.prototype.fill_rect_in_buffer = function (x, y, width, height, new_state) {
        for (var yp = y; yp < y + height; yp += 1) {
            for (var xp = Math.max(x, 0); (xp < x + width) && (xp < GlobalConfiguration.game_width); xp += 1) { // An extra guard is needed here since obstacles can stick a bit off the screen
                var display_x = Math.floor(xp / 3);
                var pixel = this.display[yp][display_x];
                this.display[yp][display_x] = this.replace_subpixel(pixel, xp % 3, new_state);
            }
        }
    };
    Renderer.prototype.render_game_to_display_buffer = function (game) {
        this.black_out_display_buffer();
        switch (game.state) {
            case GameState.Won:
                this.render_win_screen();
                break;
            case GameState.Lost:
                this.render_lose_screen();
                break;
            case GameState.Playing:
                this.render_active_game(game);
                break;
        }
    };
    Renderer.prototype.render_win_screen = function () {
        // W
        this.fill_rect_in_buffer(0, 0, 1, 3, true);
        this.fill_rect_in_buffer(2, 0, 1, 3, true);
        this.fill_rect_in_buffer(4, 0, 1, 3, true);
        this.fill_rect_in_buffer(0, 2, 5, 1, true);
        // I
        this.fill_rect_in_buffer(6, 0, 3, 1, true);
        this.fill_rect_in_buffer(6, 2, 3, 1, true);
        this.fill_rect_in_buffer(7, 1, 1, 1, true);
        // N
        this.fill_rect_in_buffer(10, 0, 3, 1, true);
        this.fill_rect_in_buffer(10, 1, 1, 2, true);
        this.fill_rect_in_buffer(12, 1, 1, 2, true);
    };
    Renderer.prototype.render_lose_screen = function () {
        // L
        this.fill_rect_in_buffer(0, 0, 1, 4, true);
        this.fill_rect_in_buffer(0, 3, 4, 1, true);
        // O
        this.fill_rect_in_buffer(5, 0, 4, 1, true);
        this.fill_rect_in_buffer(5, 0, 1, 4, true);
        this.fill_rect_in_buffer(6, 3, 3, 1, true);
        this.fill_rect_in_buffer(8, 0, 1, 3, true);
        // S
        this.fill_rect_in_buffer(1, 5, 5, 1, true);
        this.fill_rect_in_buffer(1, 6, 1, 2, true);
        this.fill_rect_in_buffer(2, 7, 4, 1, true);
        this.fill_rect_in_buffer(5, 8, 1, 2, true);
        this.fill_rect_in_buffer(1, 9, 4, 1, true);
        // E
        this.fill_rect_in_buffer(8, 5, 4, 1, true);
        this.fill_rect_in_buffer(8, 6, 1, 1, true);
        this.fill_rect_in_buffer(8, 7, 4, 1, true);
        this.fill_rect_in_buffer(8, 8, 1, 1, true);
        this.fill_rect_in_buffer(8, 9, 4, 1, true);
    };
    Renderer.prototype.render_active_game = function (game) {
        var _this = this;
        // Top and bottom rows:
        this.fill_rect_in_buffer(0, 0, GlobalConfiguration.game_width, 1, true);
        this.fill_rect_in_buffer(0, Renderer.real_canvas_height - 1, GlobalConfiguration.game_width, 1, true);
        // Safe zone
        this.fill_rect_in_buffer(0, Game.middle_safe_zone, GlobalConfiguration.game_width, 1, true);
        // Obstacles
        game.obstacles.forEach(function (obstacle) { return _this.fill_rect_in_buffer(obstacle.x, obstacle.y, obstacle.width, obstacle.height, true); });
        // Platforms
        game.platforms.forEach(function (platform) { return _this.fill_rect_in_buffer(platform.x, platform.y, platform.width, platform.height, true); });
        // Frog
        this.swap_subpixel(game.frog_position[0], game.frog_position[1]);
    };
    // Canvas painting logic
    Renderer.prototype.pixel_to_style = function (pixel) {
        return "#" + (pixel[0] ? 'FF' : '00') + (pixel[1] ? 'FF' : '00') + (pixel[2] ? 'FF' : '00');
    };
    Renderer.prototype.paint_displays = function () {
        if (this.real_context != null) {
            this.paint_real_display();
        }
        if (this.simulator_context != null) {
            this.paint_simulator_display();
        }
    };
    Renderer.prototype.paint_real_display = function () {
        for (var y = 0; y < Renderer.real_canvas_height; y += 1) {
            for (var x = 0; x < Renderer.real_canvas_width; x += 1) {
                this.real_context.fillStyle = this.pixel_to_style(this.display[y][x]);
                this.real_context.fillRect(x, y, 1, 1);
            }
        }
    };
    Renderer.prototype.paint_simulator_display = function () {
        // It's easier to first clear the simulator, instead of painting a bunch of black rects everywhere
        this.simulator_context.clearRect(0, 0, Renderer.real_canvas_width * Renderer.simulator_canvas_scale, Renderer.real_canvas_height * Renderer.simulator_canvas_scale);
        var paint_simulator_subpixel = function (context, style, offset, real_x, real_y) {
            // Paints a single subpixel on the simulator.
            // Where context = the simulator context
            //       style = the rectangles style,
            //       offset = 0 for R, 1 for G, 2 for B
            //       real_x = real canvas x
            //       real_y = real canvas y
            context.fillStyle = style;
            context.fillRect(real_x * Renderer.simulator_canvas_scale + (Renderer.simulator_canvas_scale / 3) * offset, real_y * Renderer.simulator_canvas_scale, Renderer.simulator_canvas_scale / 3, Renderer.simulator_canvas_scale);
        };
        for (var y = 0; y < Renderer.real_canvas_height; y += 1) {
            for (var x = 0; x < Renderer.real_canvas_width; x += 1) {
                var cur_pixel = this.display[y][x];
                if (cur_pixel[0]) {
                    paint_simulator_subpixel(this.simulator_context, "#FF0000", 0, x, y);
                }
                if (cur_pixel[1]) {
                    paint_simulator_subpixel(this.simulator_context, "#00FF00", 1, x, y);
                }
                if (cur_pixel[2]) {
                    paint_simulator_subpixel(this.simulator_context, "#0000FF", 2, x, y);
                }
            }
        }
    };
    Renderer.real_canvas_height = GlobalConfiguration.game_height;
    Renderer.real_canvas_width = GlobalConfiguration.game_width / 3;
    Renderer.simulator_canvas_scale = 30;
    return Renderer;
}());
// Key Tracking
document.addEventListener('keypress', function (event) {
    switch (event.key) {
        case 'w':
            last_keypress_movement = MoveDirection.Up;
            break;
        case 'a':
            last_keypress_movement = MoveDirection.Left;
            break;
        case 's':
            last_keypress_movement = MoveDirection.Down;
            break;
        case 'd':
            last_keypress_movement = MoveDirection.Right;
            break;
        default:
            last_keypress_movement = MoveDirection.None;
            break;
    }
    console.log(event.key);
});
var last_keypress_movement = MoveDirection.None;
// Game-step, render loop
window.onload = function () {
    var renderer = new Renderer();
    var game = new Game();
    render(game, renderer);
    gameloop(game, renderer);
};
function gameloop(game, renderer) {
    window.setInterval(function () {
        game.step(last_keypress_movement);
        last_keypress_movement = MoveDirection.None;
        render(game, renderer);
    }, 20);
}
function render(game, renderer) {
    renderer.render_game_to_display_buffer(game);
    renderer.paint_displays();
}
