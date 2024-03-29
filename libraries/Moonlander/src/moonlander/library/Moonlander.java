/**
 * Moonlander
 * Moonlander let's you integrate GNU Rocket to your Processing sketches and take full control of your time-varying parameters.
 * http://github.com/anttihirvonen/moonlander
 *
 * Copyright (c) 2014 Antti Hirvonen http://github.com/anttihirvonen
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * @author      Antti Hirvonen http://github.com/anttihirvonen
 * @modified    06/09/2018
 * @version     0.9.0 (1)
 */
package moonlander.library;


import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Collections;
import java.util.logging.*;
import processing.core.*;
import ddf.minim.*;


/**
 * Moonlander
 * 
 * @example Integration 
 * 
 * (the tag @example followed by the name of an example included in folder 'examples' will
 * automatically include the example in the javadoc.)
 *
 */
public class Moonlander {
    public final static String VERSION = "0.9.0";

    PApplet parent;

    // Main collection of all tracks
    private TrackContainer tracks;

    // Connection interface
    private Connector connector;

    private Controller controller;

    private static Logger logger = Logger.getLogger("moonlander.library");

    /**
     * Initializes library and tries to load syncdata.
     *
     * First, a connection to GNU Rocket is attempted using given host 
     * and port; if connection fails, tries to load sync data
     * from the given filepath. If both fail, no initial data is loaded.
     *
     * @param host 
     * @param port
     * @param filePath path to Rocket's XML-file
     * @param debug if true, output debug data to stdout
     */
    public Moonlander(PApplet parent, Controller controller) {
        // Start with logging off.
        // Can be enabled with changeLogLevel()
        setupLogging(Level.INFO);

        tracks = new TrackContainer();
        this.parent = parent;
        this.controller = controller;
    }

    /**
     * Shortcut to initializing Rocket connection
     * with given soundtrack file (uses MinimController).
     */
    public static Moonlander initWithSoundtrack(PApplet applet, String filename, int beatsPerMinute, int rowsPerBeat) {
        Minim minim = new Minim(applet);
        AudioPlayer song = minim.loadFile(filename, 1024);

        return new Moonlander(applet, new MinimController(song, beatsPerMinute, rowsPerBeat));
    }

    private void setupLogging(Level logLevel) {
        // Create own handler
        ConsoleHandler handler = new ConsoleHandler();
        handler.setLevel(Level.FINEST);

        logger.setUseParentHandlers(false);
        logger.addHandler(handler);
        // This controls the actual logging level
        logger.setLevel(logLevel);
    }

    public void changeLogLevel(Level logLevel) {
        logger.setLevel(logLevel);
    }

    /** 
     * Fires up the connection to Rocket, or in case of
     * connection failure, loads data from given XML syncfile.
     *
     * If both connectors fail, a message is logged with level SEVERE.
     * Use changeLogLevel() to see more fine grained output if you need
     * to investigate.
     *
     * @return true if connector was initialized, otherwise false.
     */
    public boolean start(String host, int port, String filePath) {

        // If connection to rocket fails, try to load syncdata from file
        try {
            connector = new SocketConnector(logger, tracks, controller, host, port);
        } catch (Exception e) {
            try {
                connector = new ProjectFileConnector(logger, tracks, controller, parent.sketchPath(filePath));
            } catch (Exception ex) {
                logger.severe("Both connectors failed. Either run Rocket or put 'syncdata.rocket' file into sketch's folder.");
                return false;
            }
        }
        
        logger.info("Moonlander initialized successfully.");

        return true;
    }

    /**
     * Shortcut for starting Moonlander with sane defaults.
     *
     * Rocket is assumed to be running at localhost:1338.
     * If connection fails, syncdata is loaded from a
     * file called 'syncdata.rocket' instead.
     */
    public boolean start() {
        return start("localhost", 1338, "syncdata.rocket");
    }

    /**
     * Handle communication and controller updates.
     *
     * This method must be called for every frame.
     */
    public void update() {
        if (controller != null && connector != null) {
            // Update controller values (may fire events)
            controller.update();
            // Communicate with device
            connector.update();
        }
    }

    // temporary(?) proxy method for getting track
    public Track getTrack(String name) {
        return tracks.getOrCreate(name);
    }

    /**
     * Returns value of a track.
     *
     * @param name track's name
     */
    public double getValue(String name) {
        return getTrack(name).getValue(controller.getCurrentRow());
    }

    /**
     * Returns int value of a track.
     *
     * Practically same as (int)Moonlander.getValue(...) -
     * just makes your code nicer to look at as no 
     * casts required!
     */
    public int getIntValue(String name) {
        return (int)getValue(name);
    }

    /**
     * Returns current time in seconds.
     */
    public double getCurrentTime() {
        return controller.getCurrentTime();
    }

    /**
     * Returns current (fractional) row.
     */
    public double getCurrentRow() {
        return controller.getCurrentRow();
    }

    /**
     * Returns the version of the library.
     * 
     * @return String
     */
    public static String version() {
        return VERSION;
    }
}
