// Game Logic
class GlobalConfiguration{
    static readonly game_height: number = 10;
    static readonly game_width: number = 15;            // e.g. 5 pixels in width
}

// This class just exists to make Game.update_objects() a bit prettier
// A near complete copy of gameObject
class GameObjectProperties{
    constructor(
        public x: number,
        public width: number,
        public height: number,
        public move_direction: number,      // x' = x + move_direction
        public frames_per_move: number,     // How often does this object move?
    ){}
}

class GameObject{
    constructor(
        public x: number,
        public y: number,
        public width: number,
        public height: number,
        public move_direction: number,      // x' = x + move_direction
        public frames_per_move: number,     // How often does this object move?
        public frame_to_move_on: number     // Move when frame == frame_to_move_on (mod frames_per_move)
    ){}
}

type Position = [X: number, Y: number]
enum GameState {
    Playing,
    Won, 
    Lost
}

enum MoveDirection {
    Up,
    Down,
    Left,
    Right,
    None
}

class Game {
    // Game State
    state: GameState = GameState.Playing
    private frame_num: number = 0

    // Board properties
    static readonly middle_safe_zone: number = 5

    // Entities
    frog_position: Position
    obstacles: Array<GameObject>
    platforms: Array<GameObject>

    constructor(){
        this.frog_position = [(GlobalConfiguration.game_width-1)/2, GlobalConfiguration.game_height-1]
        this.obstacles = [new GameObject(1, GlobalConfiguration.game_height-3, 2, 1, 1, 10, 0)]
        this.platforms = [new GameObject(4, 3, 2, 2, 1, 10, 2)]
    }

    // Frog Movement
    step(move_direction: MoveDirection){
        // Frog Movement
        if(this.state != GameState.Playing){
            return
        }
        this.frame_num += 1
        this.move_frog(move_direction)
        this.update_objects()
        this.bind_frog_to_screen()

        // Win/Lose Conditions
        if (this.has_frog_died()){
            this.state = GameState.Lost
        }

        if (this.has_frog_won()){
            this.state = GameState.Won
        }
    }

    has_frog_died(): boolean{
        // Safe rows
        if (this.frog_position[1] == 0 || this.frog_position[1] == GlobalConfiguration.game_height-1 || this.frog_position[1] == Game.middle_safe_zone){
            return false
        }

        if (this.frog_position[1] >= Game.middle_safe_zone){ // Obstacle Rows:
            for(let i = 0; i < this.obstacles.length; i += 1){
                if (this.does_frog_overlap_object(this.obstacles[i])) {
                    return true;
                }
            }
            return false;
        }
        else{   // Platform Rows:
            for(let i = 0; i < this.platforms.length; i += 1){
                if (this.does_frog_overlap_object(this.platforms[i])){
                    return false;
                }
            }
            return true;
        }
    }

    has_frog_won(): boolean{
        return this.frog_position[1] == 0
    }

    move_frog(move_direction: MoveDirection){
        switch (move_direction){
            case MoveDirection.Up:
                this.frog_position[1] -= 1
                break;
            case MoveDirection.Down:
                this.frog_position[1] += 1
                break;
            case MoveDirection.Left:
                this.frog_position[0] -= 1
                break;
            case MoveDirection.Right:
                this.frog_position[0] += 1
                break;
        }
    }

    bind_frog_to_screen(){
        this.frog_position[0] = Math.min(GlobalConfiguration.game_width-1, Math.max(0, this.frog_position[0]))
        this.frog_position[1] = Math.min(GlobalConfiguration.game_height-1, Math.max(0, this.frog_position[1]))
    }

    does_frog_overlap_object(obj: GameObject): boolean{
        return (this.frog_position[0] >= obj.x) && (this.frog_position[0] <= (obj.x + (obj.width - 1)))
               && (this.frog_position[1] >= obj.y) && (this.frog_position[1] <= (obj.y + (obj.height - 1)))
    }

    // Object movement
    update_objects(){
        let moveObjFunction = function(gameObject: GameObject){
            if (this.frame_num % gameObject.frames_per_move == gameObject.frame_to_move_on){
                if (this.does_frog_overlap_object(gameObject)){
                    this.frog_position[0] += gameObject.move_direction;
                }
                gameObject.x += gameObject.move_direction;
            }
        }.bind(this)

        this.obstacles.forEach(moveObjFunction)
        this.platforms.forEach(moveObjFunction)

        // Filtering out dead gameobjects
        let deadObjFilter = function(gameObject: GameObject): boolean{
            if (gameObject.x >= GlobalConfiguration.game_width){
                return false
            }
            else if (gameObject.x + gameObject.width < 0){
                return false
            }
            else{
                return true
            }
        }

        this.obstacles.filter(deadObjFilter)
        this.platforms.filter(deadObjFilter)

        // And spawning new ones
        // NOTE: This code is a bit janky, and platforms/objects can spawn on top of eachother. I might fix this in the future
        let obstacle_spawn_probs = [0.01, 0.01, 0.01]
        let obstacle_spawn_attributes = [new GameObjectProperties(-2, 3, 1, 1, 8),
                                         new GameObjectProperties(GlobalConfiguration.game_width-1, 2, 1, -1, 12),
                                         new GameObjectProperties(-1, 2, 1, 1, 12)]
        
        let platform_spawn_probs = [0.01, 0.01, 0.01]
        let platform_spawn_attributes = [new GameObjectProperties(-2, 3, 1, 1, 8),
                                         new GameObjectProperties(GlobalConfiguration.game_width-1, 2, 1, -1, 12),
                                         new GameObjectProperties(-1, 2, 2, 1, 12)]
        
        for(let yp = 0; yp < 3; yp += 1){
            if (Math.random() <= obstacle_spawn_probs[yp]){
                let obs = obstacle_spawn_attributes[yp]
                this.obstacles.push(new GameObject(obs.x, Game.middle_safe_zone+1+yp, obs.width, obs.height, 
                                                   obs.move_direction, obs.frames_per_move, this.frame_num % obs.frames_per_move))
            }

            if (Math.random() <= platform_spawn_probs[yp]){
                let plat = platform_spawn_attributes[yp]
                this.platforms.push(new GameObject(plat.x, 1+yp, plat.width, plat.height, 
                                                   plat.move_direction, plat.frames_per_move, this.frame_num % plat.frames_per_move))
            }
        }
    }
}

// Rendering Logic
type Pixel = [R: boolean, G: boolean, B: boolean]

class Renderer{
    // Display Properties
    private display: Array<Array<Pixel>>
    
    // Canvas Properties
    private real_context: CanvasRenderingContext2D;
    private simulator_context: CanvasRenderingContext2D;
    static readonly real_canvas_height: number = GlobalConfiguration.game_height;
    static readonly real_canvas_width: number = GlobalConfiguration.game_width/3;
    static readonly simulator_canvas_scale: number = 30;
    constructor(){
        // Canvas Setup
        let real_canvas = document.getElementById('real_game_canvas') as HTMLCanvasElement;
        if (real_canvas != null){
            real_canvas.height = Renderer.real_canvas_height
            real_canvas.width = Renderer.real_canvas_width
            this.real_context = real_canvas.getContext("2d")
        }
        
        let simulator_canvas = document.getElementById('simulated_game_canvas') as HTMLCanvasElement;
        if (simulator_canvas != null){
            simulator_canvas.height = Renderer.real_canvas_height * Renderer.simulator_canvas_scale
            simulator_canvas.width = Renderer.real_canvas_width * Renderer.simulator_canvas_scale
            this.simulator_context = simulator_canvas.getContext("2d")
        }

        this.initialize_display(Renderer.real_canvas_height, Renderer.real_canvas_width)
    }

    // Display logic
    initialize_display(height: number, width: number){
        // I wish typescript had list comprehension :'(
        var display: Array<Array<Pixel>> = []
        
        for (var i = 0; i < height; i += 1){
            var row: Array<Pixel> = []

            for (var j = 0; j < width; j += 1){
                row.push([true, j % 3 >= 1, j % 3 >= 2])      // Test stripes
            }

            display.push(row)
        }

        this.display = display
    }

    // Buffer operations
    black_out_display_buffer(){
        for (var row of this.display){
            for (var x = 0; x < row.length; x += 1){
                row[x] = [false, false, false]
            }
        }
    }

    replace_subpixel(pixel: Pixel, index: number, new_state: boolean): Pixel{
        let new_pixel = pixel
        new_pixel[index] = new_state
        return new_pixel
    }

    swap_subpixel(x: number, y: number){
        let display_x = Math.floor(x/3)

        let pixel = this.display[y][display_x]
        this.display[y][display_x] = this.replace_subpixel(pixel, x%3, !pixel[x%3])
    }


    fill_rect_in_buffer(x: number, y:number, width:number, height:number, new_state:boolean){
        for (let yp = y; yp < y + height; yp += 1){
            for (let xp = Math.max(x, 0); (xp < x + width) && (xp < GlobalConfiguration.game_width); xp += 1){   // An extra guard is needed here since obstacles can stick a bit off the screen
                let display_x = Math.floor(xp / 3)

                let pixel = this.display[yp][display_x]
                this.display[yp][display_x] = this.replace_subpixel(pixel, xp % 3, new_state)
            }
        }
    }
    
    render_game_to_display_buffer(game: Game){
        this.black_out_display_buffer()

        switch (game.state){
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
    }

    render_win_screen(){
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
    }

    render_lose_screen(){
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
    }

    render_active_game(game: Game){
        // Top and bottom rows:
        this.fill_rect_in_buffer(0, 0, GlobalConfiguration.game_width, 1, true)
        this.fill_rect_in_buffer(0, Renderer.real_canvas_height-1, GlobalConfiguration.game_width, 1, true)

        // Safe zone
        this.fill_rect_in_buffer(0, Game.middle_safe_zone, GlobalConfiguration.game_width, 1, true)

        // Obstacles
        game.obstacles.forEach((obstacle) => this.fill_rect_in_buffer(obstacle.x, obstacle.y, obstacle.width, obstacle.height, true))

        // Platforms
        game.platforms.forEach((platform) => this.fill_rect_in_buffer(platform.x, platform.y, platform.width, platform.height, true))

        // Frog
        this.swap_subpixel(game.frog_position[0], game.frog_position[1])
    }

    // Canvas painting logic
    pixel_to_style(pixel: Pixel): string{
        return `#${pixel[0] ? 'FF' : '00'}${pixel[1] ? 'FF' : '00'}${pixel[2] ? 'FF' : '00'}`
    }

    paint_displays(){
        if (this.real_context != null){
            this.paint_real_display()
        }
        if (this.simulator_context != null){
            this.paint_simulator_display()
        }
    }

    paint_real_display(){
        for(var y = 0; y < Renderer.real_canvas_height; y += 1){
            for(var x = 0; x < Renderer.real_canvas_width; x += 1){
                this.real_context.fillStyle = this.pixel_to_style(this.display[y][x])
                this.real_context.fillRect(x,y,1,1);
            }
        }
    }

    paint_simulator_display(){
        // It's easier to first clear the simulator, instead of painting a bunch of black rects everywhere
        this.simulator_context.clearRect(0,0,
                                        Renderer.real_canvas_width*Renderer.simulator_canvas_scale,
                                        Renderer.real_canvas_height*Renderer.simulator_canvas_scale)
        
        let paint_simulator_subpixel = function(context: CanvasRenderingContext2D,
            style: string, offset: number, real_x: number, real_y: number){
            // Paints a single subpixel on the simulator.
            // Where context = the simulator context
            //       style = the rectangles style,
            //       offset = 0 for R, 1 for G, 2 for B
            //       real_x = real canvas x
            //       real_y = real canvas y
            
            context.fillStyle = style;
            context.fillRect(real_x*Renderer.simulator_canvas_scale + (Renderer.simulator_canvas_scale/3) * offset, real_y * Renderer.simulator_canvas_scale,
                             Renderer.simulator_canvas_scale/3, Renderer.simulator_canvas_scale)
        }


        for(var y = 0; y < Renderer.real_canvas_height; y += 1){
            for(var x = 0; x < Renderer.real_canvas_width; x += 1){
                let cur_pixel = this.display[y][x]
                if (cur_pixel[0]){
                    paint_simulator_subpixel(this.simulator_context, "#FF0000", 0, x, y)
                }
                if (cur_pixel[1]){
                    paint_simulator_subpixel(this.simulator_context, "#00FF00", 1, x, y)
                }
                if (cur_pixel[2]){
                    paint_simulator_subpixel(this.simulator_context, "#0000FF", 2, x, y)
                }
            }
        }
    }
}

// Key Tracking
document.addEventListener('keypress', (event) => {
    switch (event.key){
        case 'w':
            last_keypress_movement = MoveDirection.Up
            break;
        case 'a':
            last_keypress_movement = MoveDirection.Left
            break;
        case 's':
            last_keypress_movement = MoveDirection.Down
            break;
        case 'd':
            last_keypress_movement = MoveDirection.Right
            break;
        default:
            last_keypress_movement = MoveDirection.None
            break;
    }
    console.log(event.key);
})

let last_keypress_movement: MoveDirection = MoveDirection.None;

// Game-step, render loop
window.onload = function(){
    let renderer = new Renderer()
    let game = new Game()
    render(game, renderer)

    gameloop(game, renderer)
}

function gameloop(game: Game, renderer: Renderer){
    window.setInterval(() => {
        game.step(last_keypress_movement)
        last_keypress_movement = MoveDirection.None
        render(game, renderer)
    }, 20)
}

function render(game: Game, renderer: Renderer){
    renderer.render_game_to_display_buffer(game)
    renderer.paint_displays()
}