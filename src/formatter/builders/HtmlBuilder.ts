import { LyricsLine, CommentLine, TabLine, CustomLine } from "../../models/lines";
import { Lyrics, Section, Tabs, LyricsType } from "../../models/sections";
import { DataHelper } from "../DataHelper";
import { BuilderSettings } from "./BuilderSettings";
import { IBuilder } from "./IBuilder";

interface IPrintable {
    toStringLines(): string[];
}

class SimplePrintable implements IPrintable {
    value: string;
    constructor(value: string) {
        this.value = value;
    }
    toStringLines(): string[] {
        return [this.value];
    }
}

class HtmlElement implements IPrintable {
    tag: string;
    classNames: string[] = [];
    innerHtml: IPrintable[] = [];

    constructor(tag: string, classNames: string[], ...innerHtml: IPrintable[]) {
        this.tag = tag;
        this.innerHtml = innerHtml;
        this.classNames = classNames;
    }

    toStringLines(): string[] {
        const lines: string[] = [];
        lines.push(`<${this.tag} class="${this.classNames.join(" ")}">`);
        this.innerHtml.forEach((element) => {
            lines.push(...element.toStringLines());
        });
        lines.push(`</${this.tag}>`);
        return lines;
    }

    addElement(...element: IPrintable[]) {
        this.innerHtml.push(...element);
    }
    addString(value: string) {
        this.innerHtml.push(new SimplePrintable(value));
    }
}

export class HtmlBuilder implements IBuilder {
    settings: BuilderSettings;

    constructor(settings: BuilderSettings = new BuilderSettings()) {
        this.settings = settings;
    }

    protected buildHtmlElement(tag: string, value: string, classNames: string[] = []): string {
        return `<${tag} class="${classNames.join(" ")}">${value}</${tag}>`;
    }

    titleMetadata(value: string): string[] {
        return [this.buildHtmlElement("h1", value, ["metadata", "title-metadata"])];
    }

    subtitleMetadata(value: string): string[] {
        return [this.buildHtmlElement("h2", value, ["metadata", "subtitle-metadata"])];
    }

    artistsMetadata(values: string[]): string[] {
        return [this.buildHtmlElement("h3", values.join(", "), ["metadata", "artist-metadata"])];
    }

    composersMetadata(values: string[]): string[] {
        const label = values.length > 1 ? "Composers" : "Composer";
        const classNames = ["metadata", "composer-metadata"];
        return [this.buildHtmlElement("div", label + ": " + values.join(", "), classNames)];
    }

    lyricistsMetadata(values: string[]): string[] {
        const label = values.length > 1 ? "Lyricists" : "Lyricist";
        const classNames = ["metadata", "lyricist-metadata"];
        return [this.buildHtmlElement("div", label + ": " + values.join(", "), classNames)];
    }

    arrangersMetadata(values: string[]): string[] {
        const label = values.length > 1 ? "Arrangers" : "Arranger";
        const classNames = ["metadata", "arranger-metadata"];
        return [this.buildHtmlElement("div", label + ": " + values.join(", "), classNames)];
    }

    yearMetadata(value: number): string[] {
        const label = "Year";
        const classNames = ["metadata", "year-metadata"];
        return [this.buildHtmlElement("div", label + ": " + value, classNames)];
    }

    copyrightMetadata(value: string): string[] {
        const label = "Copyright";
        const classNames = ["metadata", "copyright-metadata"];
        return [this.buildHtmlElement("div", label + ": " + value, classNames)];
    }

    timeMetadata(value: string): string[] {
        const label = "Time";
        const classNames = ["metadata", "time-metadata"];
        return [this.buildHtmlElement("div", label + ": " + value, classNames)];
    }

    tempoMetadata(value: number): string[] {
        const label = "Tempo";
        const classNames = ["metadata", "tempo-metadata"];
        return [this.buildHtmlElement("div", label + ": " + value, classNames)];
    }
    durationMetadata(value: number): string[] {
        const label = "Duration";
        const classNames = ["metadata", "duration-metadata"];
        return [this.buildHtmlElement("div", label + ": " + DataHelper.toMinutesSeconds(value), classNames)];
    }
    capoMetadata(value: number): string[] {
        const label = "Capo";
        const classNames = ["metadata", "capo-metadata"];
        return [this.buildHtmlElement("div", label + ": " + value, classNames)];
    }
    keyMetadata(value: string): string[] {
        const label = "Key";
        const classNames = ["metadata", "key-metadata"];
        return [this.buildHtmlElement("div", label + ": " + value, classNames)];
    }
    customMetadatas(values: [string, string | null][]): string[] {
        let lines: string[] = [];
        const classNames = ["metadata", "custom-metadata"];
        values.forEach((value) => {
            lines.push(this.buildHtmlElement("div", DataHelper.toProperCase(value[0]) + ": " + value[1], classNames));
        });
        return lines;
    }

    emptyLine(): string[] {
        const classNames = ["line", "empty-line"];
        return [this.buildHtmlElement("div", "", classNames)];
    }

    private createChordElement(chord: string, isChord: boolean): HtmlElement {
        let classNames = ["above-lyrics"];
        if (isChord) {
            classNames.push("chord");
        } else {
            classNames.push("annotation");
        }
        let element = new HtmlElement("span", classNames);
        element.addString(chord);
        return element;
    }

    private createLyricsElement(text: string): HtmlElement {
        let element = new HtmlElement("span", ["lyrics"]);
        element.addString(text);
        return element;
    }

    private createChordLyricsElement(chord: string, isChord: boolean, lyrics: string | undefined): IPrintable {
        if (!this.settings.showChords && lyrics == "&nbsp;") {
            return new SimplePrintable(""); // avoid empty element
        }

        let element = new HtmlElement("div", ["chord-lyrics"]);
        if (this.settings.showChords) {
            element.addElement(this.createChordElement(chord, isChord));
        }
        if (lyrics) {
            element.addElement(this.createLyricsElement(lyrics));
        }
        return element;
    }

    lyricsLine(line: LyricsLine): string[] {
        let haslyrics = line.pairs
            .map((p) => p.lyrics)
            .join("")
            .trim();
        if (!this.settings.showChords && !haslyrics) {
            return [];
        }

        let lineElement = new HtmlElement("div", ["lyrics-line"]);
        line.pairs.forEach((pair, _) => {
            let hasTextAbove = pair.chord != null || pair.text != null;
            let isChord = pair.chord != null;
            let chordValue = "";
            if (pair.chord) {
                chordValue = this.settings.useSimpleChord ? pair.chord.toSimpleString() : pair.chord.toString();
            } else if (pair.text) {
                chordValue = pair.text;
            }

            let lyrics = hasTextAbove ? pair.lyrics : pair.lyrics.trimStart();
            lyrics = lyrics.replace(/ +/g, "&nbsp;");
            if (lyrics == "") {
                lyrics = "&nbsp;";
            }

            var element = hasTextAbove
                ? this.createChordLyricsElement(chordValue, isChord, lyrics)
                : this.createLyricsElement(lyrics);
            lineElement.addElement(element);
        });

        return lineElement.toStringLines();
    }

    commentLine(line: CommentLine): string[] {
        const classNames = ["line", "comment-line"];
        return [this.buildHtmlElement("div", line.comment, classNames)];
    }

    tabLine(line: TabLine): string[] {
        const classNames = ["line", "tab-line"];
        return [this.buildHtmlElement("div", line.value, classNames)];
    }

    customLine(line: CustomLine): string[] {
        const classNames = ["metadata", "custom-metadata", line.name];
        return [this.buildHtmlElement("div", line.value ? line.value : "", classNames)];
    }

    sectionStart(section: Section): string[] {
        let rows: string[] = [];
        if (section instanceof Lyrics || section instanceof Tabs) {
            let type = "tab";
            if (section instanceof Lyrics) {
                switch (section.type) {
                    case LyricsType.Chorus:
                        type = "chorus";
                        break;
                    case LyricsType.Verse:
                        type = "verse";
                        break;
                    case LyricsType.Bridge:
                        type = "bridge";
                        break;
                    case LyricsType.Custom:
                        type = "custom";
                        break;
                    default:
                        break;
                }
            }
            rows.push(`<div class="section ${type}-section">`);
            if (section.value) {
                const classNames = ["section-title"];
                rows.push(this.buildHtmlElement("div", section.value, classNames));
            }
        }
        return rows;
    }

    sectionEnd(section: Section): string[] {
        if (section instanceof Lyrics || section instanceof Tabs) {
            return ["</div>"];
        }
        return [];
    }

    metadataStart(): string[] {
        const classNames = ["song-metadata"];
        return [`<div class=${classNames.join(" ")}>`];
    }

    metadataEnd(): string[] {
        return ["</div>"];
    }

    contentStart(): string[] {
        const classNames = ["song-content"];
        return [`<div class=${classNames.join(" ")}>`];
    }

    contentEnd(): string[] {
        return [`</div>`];
    }
}
