--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: test_migration; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA test_migration;


ALTER SCHEMA test_migration OWNER TO neondb_owner;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: success_factor_stage; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.success_factor_stage AS ENUM (
    'Identification',
    'Definition',
    'Delivery',
    'Closure'
);


ALTER TYPE public.success_factor_stage OWNER TO neondb_owner;

--
-- Name: integer_to_uuid(integer); Type: FUNCTION; Schema: test_migration; Owner: neondb_owner
--

CREATE FUNCTION test_migration.integer_to_uuid(int_id integer) RETURNS uuid
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    RETURN ('00000000-' || LPAD(to_hex(int_id), 4, '0') || '-4000-8000-000000000000')::UUID;
END;
$$;


ALTER FUNCTION test_migration.integer_to_uuid(int_id integer) OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cynefin_selections; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.cynefin_selections (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text DEFAULT 'Untitled Cynefin Selection'::text NOT NULL,
    data jsonb NOT NULL,
    last_updated timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cynefin_selections OWNER TO neondb_owner;

--
-- Name: cynefin_selections_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.cynefin_selections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cynefin_selections_id_seq OWNER TO neondb_owner;

--
-- Name: cynefin_selections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.cynefin_selections_id_seq OWNED BY public.cynefin_selections.id;


--
-- Name: goal_maps; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.goal_maps (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text DEFAULT 'Untitled Goal Map'::text NOT NULL,
    data jsonb NOT NULL,
    last_updated timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.goal_maps OWNER TO neondb_owner;

--
-- Name: goal_maps_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.goal_maps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.goal_maps_id_seq OWNER TO neondb_owner;

--
-- Name: goal_maps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.goal_maps_id_seq OWNED BY public.goal_maps.id;


--
-- Name: organisation_heuristics; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.organisation_heuristics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organisation_id uuid NOT NULL,
    success_factor character varying(255) NOT NULL,
    goal text,
    metric text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organisation_heuristics OWNER TO neondb_owner;

--
-- Name: organisation_memberships; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.organisation_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer NOT NULL,
    organisation_id uuid NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organisation_memberships OWNER TO neondb_owner;

--
-- Name: organisations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.organisations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organisations OWNER TO neondb_owner;

--
-- Name: personal_heuristics; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.personal_heuristics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    favourite boolean DEFAULT false,
    project_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.personal_heuristics OWNER TO neondb_owner;

--
-- Name: plans; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer NOT NULL,
    user_id integer,
    name character varying(255),
    blocks jsonb DEFAULT '{"block1": {"completed": false, "successFactors": [], "personalHeuristics": []}, "block2": {"tasks": [], "completed": false, "stakeholders": []}, "block3": {"timeline": null, "completed": false, "deliveryNotes": "", "deliveryApproach": ""}}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.plans OWNER TO neondb_owner;

--
-- Name: project_tasks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.project_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    title text,
    description text,
    factor_id text,
    stage text,
    status text DEFAULT 'pending'::text,
    due_date timestamp without time zone,
    assigned_to text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sort_order integer DEFAULT 0,
    completed boolean DEFAULT false,
    task_notes text,
    task_type text DEFAULT 'custom'::text,
    text text,
    origin text,
    source_id text,
    notes text,
    priority text,
    owner text
);


ALTER TABLE public.project_tasks OWNER TO neondb_owner;

--
-- Name: project_tasks_backup; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.project_tasks_backup (
    id uuid,
    project_id integer,
    text text,
    stage character varying(50),
    origin character varying(50),
    source_id character varying(255),
    completed boolean,
    notes text,
    priority character varying(50),
    due_date character varying(50),
    owner character varying(255),
    status character varying(50),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.project_tasks_backup OWNER TO neondb_owner;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    description text,
    goal_map_id integer,
    cynefin_selection_id integer,
    tcof_journey_id integer,
    last_updated timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    organisation_id uuid,
    sector character varying(100),
    custom_sector character varying(100),
    org_type character varying(100),
    team_size character varying(100),
    current_stage character varying(100),
    is_profile_complete boolean DEFAULT false NOT NULL,
    organisation_size character varying(100),
    industry character varying(100)
);


ALTER TABLE public.projects OWNER TO neondb_owner;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO neondb_owner;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: success_factor_ratings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.success_factor_ratings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id integer NOT NULL,
    factor_id character varying(255) NOT NULL,
    resonance integer NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT success_factor_ratings_resonance_check CHECK (((resonance >= 1) AND (resonance <= 5)))
);


ALTER TABLE public.success_factor_ratings OWNER TO neondb_owner;

--
-- Name: success_factor_tasks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.success_factor_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    factor_id character varying(36) NOT NULL,
    stage public.success_factor_stage NOT NULL,
    text text NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.success_factor_tasks OWNER TO neondb_owner;

--
-- Name: success_factors; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.success_factors (
    id character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    tasks jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.success_factors OWNER TO neondb_owner;

--
-- Name: tcof_journeys; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tcof_journeys (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text DEFAULT 'Untitled TCOF Journey'::text NOT NULL,
    data jsonb NOT NULL,
    last_updated timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tcof_journeys OWNER TO neondb_owner;

--
-- Name: tcof_journeys_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.tcof_journeys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tcof_journeys_id_seq OWNER TO neondb_owner;

--
-- Name: tcof_journeys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.tcof_journeys_id_seq OWNED BY public.tcof_journeys.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    email text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    avatar_url character varying(255),
    notification_prefs jsonb DEFAULT '{}'::jsonb,
    locale character varying(50) DEFAULT 'en-US'::character varying,
    timezone character varying(50) DEFAULT 'UTC'::character varying
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: v_success_factors_full; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW public.v_success_factors_full AS
 WITH stage_tasks AS (
         SELECT f.id,
            f.title,
            f.description,
            ft.stage,
            array_agg(ft.text ORDER BY ft.id) FILTER (WHERE (ft.text IS NOT NULL)) AS task_array
           FROM (public.success_factors f
             LEFT JOIN public.success_factor_tasks ft ON (((f.id)::text = (ft.factor_id)::text)))
          GROUP BY f.id, f.title, f.description, ft.stage
        ), factor_stages AS (
         SELECT stage_tasks.id,
            stage_tasks.title,
            stage_tasks.description,
            max(
                CASE
                    WHEN (stage_tasks.stage = 'Identification'::public.success_factor_stage) THEN stage_tasks.task_array
                    ELSE NULL::text[]
                END) AS identification_tasks,
            max(
                CASE
                    WHEN (stage_tasks.stage = 'Definition'::public.success_factor_stage) THEN stage_tasks.task_array
                    ELSE NULL::text[]
                END) AS definition_tasks,
            max(
                CASE
                    WHEN (stage_tasks.stage = 'Delivery'::public.success_factor_stage) THEN stage_tasks.task_array
                    ELSE NULL::text[]
                END) AS delivery_tasks,
            max(
                CASE
                    WHEN (stage_tasks.stage = 'Closure'::public.success_factor_stage) THEN stage_tasks.task_array
                    ELSE NULL::text[]
                END) AS closure_tasks
           FROM stage_tasks
          GROUP BY stage_tasks.id, stage_tasks.title, stage_tasks.description
        )
 SELECT id,
    title,
    description,
    jsonb_build_object('Identification', COALESCE(identification_tasks, ARRAY[]::text[]), 'Definition', COALESCE(definition_tasks, ARRAY[]::text[]), 'Delivery', COALESCE(delivery_tasks, ARRAY[]::text[]), 'Closure', COALESCE(closure_tasks, ARRAY[]::text[])) AS tasks
   FROM factor_stages
  ORDER BY title;


ALTER VIEW public.v_success_factors_full OWNER TO neondb_owner;

--
-- Name: plans; Type: TABLE; Schema: test_migration; Owner: neondb_owner
--

CREATE TABLE test_migration.plans (
    id integer NOT NULL,
    legacy_project_id integer NOT NULL,
    project_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE test_migration.plans OWNER TO neondb_owner;

--
-- Name: plans_id_seq; Type: SEQUENCE; Schema: test_migration; Owner: neondb_owner
--

CREATE SEQUENCE test_migration.plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE test_migration.plans_id_seq OWNER TO neondb_owner;

--
-- Name: plans_id_seq; Type: SEQUENCE OWNED BY; Schema: test_migration; Owner: neondb_owner
--

ALTER SEQUENCE test_migration.plans_id_seq OWNED BY test_migration.plans.id;


--
-- Name: projects; Type: TABLE; Schema: test_migration; Owner: neondb_owner
--

CREATE TABLE test_migration.projects (
    legacy_id integer NOT NULL,
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    user_id integer NOT NULL,
    organisation_id uuid,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE test_migration.projects OWNER TO neondb_owner;

--
-- Name: success_factor_ratings; Type: TABLE; Schema: test_migration; Owner: neondb_owner
--

CREATE TABLE test_migration.success_factor_ratings (
    id integer NOT NULL,
    legacy_project_id integer NOT NULL,
    project_id uuid NOT NULL,
    factor_id text NOT NULL,
    rating integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE test_migration.success_factor_ratings OWNER TO neondb_owner;

--
-- Name: success_factor_ratings_id_seq; Type: SEQUENCE; Schema: test_migration; Owner: neondb_owner
--

CREATE SEQUENCE test_migration.success_factor_ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE test_migration.success_factor_ratings_id_seq OWNER TO neondb_owner;

--
-- Name: success_factor_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: test_migration; Owner: neondb_owner
--

ALTER SEQUENCE test_migration.success_factor_ratings_id_seq OWNED BY test_migration.success_factor_ratings.id;


--
-- Name: cynefin_selections id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cynefin_selections ALTER COLUMN id SET DEFAULT nextval('public.cynefin_selections_id_seq'::regclass);


--
-- Name: goal_maps id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.goal_maps ALTER COLUMN id SET DEFAULT nextval('public.goal_maps_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: tcof_journeys id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tcof_journeys ALTER COLUMN id SET DEFAULT nextval('public.tcof_journeys_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: plans id; Type: DEFAULT; Schema: test_migration; Owner: neondb_owner
--

ALTER TABLE ONLY test_migration.plans ALTER COLUMN id SET DEFAULT nextval('test_migration.plans_id_seq'::regclass);


--
-- Name: success_factor_ratings id; Type: DEFAULT; Schema: test_migration; Owner: neondb_owner
--

ALTER TABLE ONLY test_migration.success_factor_ratings ALTER COLUMN id SET DEFAULT nextval('test_migration.success_factor_ratings_id_seq'::regclass);


--
-- Data for Name: cynefin_selections; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.cynefin_selections (id, user_id, name, data, last_updated, created_at) FROM stdin;
1	3	Project XYZ	{"quadrant": "complex", "lastUpdated": 1746183824472}	2025-05-02 11:03:44.374	2025-05-02 11:03:44.393014
2	3	Project XYZ	{"quadrant": "complex", "lastUpdated": 1746183830039}	2025-05-02 11:03:49.714	2025-05-02 11:03:49.726831
3	3	My Cynefin Assessment	{"quadrant": "complicated", "lastUpdated": 1746468642163}	2025-05-05 18:10:42.848	2025-05-05 18:10:42.866736
4	3	My Cynefin Assessment	{"quadrant": "complicated", "lastUpdated": 1746468643985}	2025-05-05 18:10:44.345	2025-05-05 18:10:44.372084
5	3	05.05.25	{"quadrant": "complex", "lastUpdated": 1746472493731}	2025-05-05 19:14:53.925	2025-05-05 19:14:53.946531
6	3	My Cynefin Assessment	{"quadrant": "chaotic", "lastUpdated": 1746475360221}	2025-05-05 20:02:40.428	2025-05-05 20:02:40.447862
7	3	My Cynefin Assessment	{"quadrant": "chaotic", "lastUpdated": 1746476498139}	2025-05-05 20:21:38.358	2025-05-05 20:21:38.377629
8	3	My Cynefin Assessment	{"quadrant": "complex", "lastUpdated": 1746548639807}	2025-05-06 16:24:00.143	2025-05-06 16:24:00.165456
9	3	My Cynefin Assessment	{"quadrant": "complex", "lastUpdated": 1746603374117}	2025-05-07 07:36:13.336	2025-05-07 07:36:13.38285
10	3	My Cynefin Assessment	{"quadrant": "complex", "lastUpdated": 1746632641267}	2025-05-07 15:44:01.527	2025-05-07 15:44:01.548293
11	3	My Cynefin Assessment	{"quadrant": "complex", "lastUpdated": 1746633365756}	2025-05-07 15:56:05.994	2025-05-07 15:56:06.013559
12	3	My Cynefin Assessment	{"quadrant": "chaotic", "lastUpdated": 1746634268695}	2025-05-07 16:11:08.931	2025-05-07 16:11:08.950064
13	3	My Cynefin Assessment	{"quadrant": "chaotic", "lastUpdated": 1746634957307}	2025-05-07 16:22:37.547	2025-05-07 16:22:37.567273
14	3	My Cynefin Assessment	{"quadrant": "complex", "lastUpdated": 1746650577765}	2025-05-07 20:42:58.042	2025-05-07 20:42:58.058732
15	3	My Cynefin Assessment	{"quadrant": "complex", "lastUpdated": 1746650647915}	2025-05-07 20:44:08.193	2025-05-07 20:44:08.211321
16	3	My Cynefin Assessment	{"quadrant": "complex", "lastUpdated": 1746652004931}	2025-05-07 21:06:45.218	2025-05-07 21:06:45.238374
17	3	My Cynefin Assessment	{"quadrant": "chaotic", "lastUpdated": 1746703732416}	2025-05-08 11:28:52.674	2025-05-08 11:28:52.694279
\.


--
-- Data for Name: goal_maps; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.goal_maps (id, user_id, name, data, last_updated, created_at) FROM stdin;
1	3	My Success Map	{"nodes": [{"x": 58.730286736751204, "y": 225.7020465027452, "id": "y176zj0", "text": "Test goal ", "timeframe": "Level 5: Strategic - 18 months "}], "connections": [], "lastUpdated": 1746171706931}	2025-05-02 07:41:46.853	2025-05-02 07:41:46.86597
2	3	My Success Map	{"nodes": [{"x": 127.47349293290732, "y": 288.403461734222, "id": "qcn71kc", "text": "New Goal Test ", "timeframe": "Level 5: Strategic - 18 "}], "connections": [], "lastUpdated": 1746171739594}	2025-05-02 07:42:19.748	2025-05-02 07:42:19.761076
3	3	My Success Map v2	{"nodes": [{"x": 127.47349293290732, "y": 288.403461734222, "id": "qcn71kc", "text": "New Goal Test ", "timeframe": "Level 5: Strategic - 18 "}], "connections": [], "lastUpdated": 1746171765983}	2025-05-02 07:42:45.877	2025-05-02 07:42:45.889602
4	3	My Success Map	{"nodes": [{"x": 367.35423751321883, "y": 324.21274685182857, "id": "0pjaunc", "text": "Have fun", "timeframe": "Level 5: Strategic - 12 months"}], "connections": [], "lastUpdated": 1746306455659}	2025-05-03 21:07:36.129	2025-05-03 21:07:36.144248
5	3	My Success Map	{"nodes": [], "connections": [], "lastUpdated": 1746306488679}	2025-05-03 21:08:08.892	2025-05-03 21:08:08.912271
6	3	My Success Map 2	{"nodes": [{"x": 270.623723949584, "y": 215.4544334671806, "id": "kvq29yl", "text": "Have fun", "timeframe": "Level 5: Strategic - 12 months"}, {"x": 426.3333282470703, "y": 112, "id": "tx9rwyf", "text": "XYZ", "timeframe": "Level 5: Strategic - 16"}], "connections": [], "lastUpdated": 1746306513082}	2025-05-03 21:08:33.487	2025-05-03 21:08:33.500491
7	3	My Success Map	{"nodes": [{"x": 120.27883084399728, "y": 239.1717169060197, "id": "mbofzng", "text": "Test Goals", "timeframe": "Level 5: Strategic - 12"}], "connections": [], "lastUpdated": 1746468610848}	2025-05-05 18:10:16.254	2025-05-05 18:10:16.273731
8	3	05.05.25	{"nodes": [{"x": 289.9364618367873, "y": 158.5043789338568, "id": "s9mk0db", "text": "Test Goals", "timeframe": "Level 5: Strategic - 12"}], "connections": [], "lastUpdated": 1746472479597}	2025-05-05 19:14:40.155	2025-05-05 19:14:40.174808
9	3	My Success Map	{"nodes": [], "connections": [], "lastUpdated": 1746475354018}	2025-05-05 20:02:34.226	2025-05-05 20:02:34.247769
10	3	Project Goal Map	{"name": "Project Goal Map", "nodes": [{"x": 1347.3034628248668, "y": 341.1867724837007, "id": "84t10jy", "text": "Complete XYZ by Z date", "timeframe": "18"}], "projectId": "2", "connections": [], "lastUpdated": 1746546588557}	2025-05-06 15:49:49.23	2025-05-06 15:49:49.249674
11	3	Project Goal Map	{"name": "Project Goal Map", "nodes": [{"x": 100, "y": 100, "id": "b8rqkvt", "text": "Test", "timeframe": "12"}, {"x": 100, "y": 100, "id": "lzkc4zi", "text": "Test 2", "timeframe": "17"}], "projectId": "2", "connections": [], "lastUpdated": 1746547650945}	2025-05-06 16:07:31.747	2025-05-06 16:07:31.767804
12	3	New Goal Map	{"goals": [{"id": "goal-1746642631698-pcyn6z5", "text": "Test 4", "level": 2, "timeframe": "Q2"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T18:30:39.460Z"}	2025-05-07 18:30:40.126	2025-05-07 18:30:17.476649
13	3	New Goal Map	{"goals": [{"id": "goal-1746643654805-576uyur", "text": "Tes5 55", "level": 1, "timeframe": "A3"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T18:47:48.711Z"}	2025-05-07 18:47:49.35	2025-05-07 18:40:30.001285
14	3	New Goal Map	{"goals": [{"id": "goal-1746645091195-tnvqhqr", "text": "Test Goal for Debugging", "level": 1, "timeframe": "Q2 2025"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T19:11:39.973Z"}	2025-05-07 19:11:40.632	2025-05-07 19:00:06.429604
15	3	New Goal Map	{"goals": [{"id": "goal-1746646131992-x6n27uk", "text": "Test goal", "level": 1, "timeframe": "Q4"}], "nodes": [{"id": "goal-1746646131992-x6n27uk", "text": "Test goal", "type": "goal", "level": 1, "timeframe": "Q4"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T19:30:07.064Z"}	2025-05-07 19:30:07.706	2025-05-07 19:28:59.530308
16	3	New Goal Map	{"goals": [{"id": "goal-1746646457585-m5l5yos", "text": "Test goal", "level": 1, "timeframe": "Q2 2025"}], "nodes": [{"id": "goal-1746646457585-m5l5yos", "text": "Test goal", "type": "goal", "level": 1, "timeframe": "Q2 2025"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T19:34:35.968Z"}	2025-05-07 19:34:36.281	2025-05-07 19:34:32.717612
17	3	New Goal Map	{"goals": [{"id": "goal-1746646531134-2o369xc", "text": "Test", "level": 1, "timeframe": "Q5"}], "nodes": [{"id": "goal-1746646531134-2o369xc", "text": "Test", "type": "goal", "level": 1, "timeframe": "Q5"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T19:36:07.052Z"}	2025-05-07 19:36:07.682	2025-05-07 19:35:37.155021
18	3	New Goal Map	{"goals": [{"id": "goal-1746647160513-n4bb7dh", "text": "Test 2", "level": 1, "timeframe": "A2 2025"}], "nodes": [{"id": "goal-1746647160513-n4bb7dh", "text": "Test 2", "type": "goal", "level": 1, "timeframe": "A2 2025"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T19:46:14.614Z"}	2025-05-07 19:46:14.924	2025-05-07 19:46:12.330693
19	3	New Goal Map	{"goals": [{"id": "goal-1746647353000-5ovjbo6", "text": "Test ", "level": 1, "timeframe": "5"}], "nodes": [{"id": "goal-1746647353000-5ovjbo6", "text": "Test ", "type": "goal", "level": 1, "timeframe": "5"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T19:49:35.448Z"}	2025-05-07 19:49:35.749	2025-05-07 19:49:19.202983
20	3	New Goal Map	{"goals": [{"id": "goal-1746647498663-cfa3xpp", "text": "Test for Agent 1", "level": 1, "timeframe": "07/05/2025"}, {"id": "goal-1746647515376-xiaujmp", "text": "Test for Agent 2", "level": 1, "timeframe": "08/05/2025"}, {"id": "goal-1746647639947-wpb16i9", "text": "Time", "level": 2, "timeframe": ""}], "nodes": [{"id": "goal-1746647498663-cfa3xpp", "text": "Test for Agent 1", "type": "goal", "level": 1, "timeframe": "07/05/2025"}, {"id": "goal-1746647515376-xiaujmp", "text": "Test for Agent 2", "type": "goal", "level": 1, "timeframe": "08/05/2025"}, {"id": "goal-1746647639947-wpb16i9", "text": "Time", "type": "goal", "level": 2, "timeframe": ""}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T19:54:09.845Z"}	2025-05-07 19:54:10.596	2025-05-07 19:52:04.654347
21	3	New Goal Map	{"goals": [{"id": "goal-1746647498663-cfa3xpp", "text": "Test for Agent 1", "level": 1, "timeframe": "07/05/2025"}, {"id": "goal-1746647515376-xiaujmp", "text": "Test for Agent 2", "level": 1, "timeframe": "08/05/2025"}, {"id": "goal-1746647655699-hvm9wo2", "text": "Test ", "level": 2, "timeframe": "Q3 2025"}, {"id": "goal-1746647674778-pwlhgnk", "text": "Test", "level": 3, "timeframe": ""}], "nodes": [{"id": "goal-1746647498663-cfa3xpp", "text": "Test for Agent 1", "type": "goal", "level": 1, "timeframe": "07/05/2025"}, {"id": "goal-1746647515376-xiaujmp", "text": "Test for Agent 2", "type": "goal", "level": 1, "timeframe": "08/05/2025"}, {"id": "goal-1746647655699-hvm9wo2", "text": "Test ", "type": "goal", "level": 2, "timeframe": "Q3 2025"}, {"id": "goal-1746647674778-pwlhgnk", "text": "Test", "type": "goal", "level": 3, "timeframe": ""}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T19:54:39.420Z"}	2025-05-07 19:54:39.71	2025-05-07 19:54:30.810746
22	3	New Goal Map	{"goals": [{"id": "goal-1746648136018-vywkucv", "text": "Goal to thank Jenni", "level": 1, "timeframe": "Q1 2025"}, {"id": "goal-1746648153035-ffkwfwf", "text": "Assessment", "level": 2, "timeframe": "Q2 2025"}], "nodes": [{"id": "goal-1746648136018-vywkucv", "text": "Goal to thank Jenni", "type": "goal", "level": 1, "timeframe": "Q1 2025"}, {"id": "goal-1746648153035-ffkwfwf", "text": "Assessment", "type": "goal", "level": 2, "timeframe": "Q2 2025"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T20:03:03.102Z"}	2025-05-07 20:03:03.401	2025-05-07 20:02:30.986914
23	3	New Goal Map	{"goals": [{"id": "goal-1746648136018-vywkucv", "text": "Goal to thank Jenni", "level": 1, "timeframe": "Q1 2025"}, {"id": "goal-1746648185693-9c3ilxr", "text": "Test", "level": 3, "timeframe": ""}], "nodes": [{"id": "goal-1746648136018-vywkucv", "text": "Goal to thank Jenni", "type": "goal", "level": 1, "timeframe": "Q1 2025"}, {"id": "goal-1746648185693-9c3ilxr", "text": "Test", "type": "goal", "level": 3, "timeframe": ""}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T20:03:31.217Z"}	2025-05-07 20:03:31.514	2025-05-07 20:03:10.359749
24	3	New Goal Map	{"goals": [{"id": "goal-1746648659589-fskhfjm", "text": "Test for Agent", "level": 1, "timeframe": "Q2 2025"}, {"id": "goal-1746648666388-km8ey7j", "text": "Test for Agent 2", "level": 4, "timeframe": ""}], "nodes": [{"id": "goal-1746648659589-fskhfjm", "text": "Test for Agent", "type": "goal", "level": 1, "timeframe": "Q2 2025"}, {"id": "goal-1746648666388-km8ey7j", "text": "Test for Agent 2", "type": "goal", "level": 4, "timeframe": ""}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T20:11:20.681Z"}	2025-05-07 20:11:20.978	2025-05-07 20:11:18.002217
25	3	New Goal Map	{"goals": [{"id": "goal-1746648755243-vfkjlv1", "text": "Test Goal", "level": 1, "timeframe": "07/05/2025"}, {"id": "goal-1746648766570-nfwcvgr", "text": "Test Goal 2", "level": 4, "timeframe": "07/05/2025"}], "nodes": [{"id": "goal-1746648755243-vfkjlv1", "text": "Test Goal", "type": "goal", "level": 1, "timeframe": "07/05/2025"}, {"id": "goal-1746648766570-nfwcvgr", "text": "Test Goal 2", "type": "goal", "level": 4, "timeframe": "07/05/2025"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T20:12:58.524Z"}	2025-05-07 20:12:58.821	2025-05-07 20:12:57.009946
26	3	New Goal Map	{"goals": [{"id": "goal-1746648823833-18tw0y9", "text": "Test 3", "level": 1, "timeframe": "Q3 2025"}, {"id": "goal-1746648834535-h3he4bj", "text": "Test 4", "level": 5, "timeframe": "Q4 2025"}], "nodes": [{"id": "goal-1746648823833-18tw0y9", "text": "Test 3", "type": "goal", "level": 1, "timeframe": "Q3 2025"}, {"id": "goal-1746648834535-h3he4bj", "text": "Test 4", "type": "goal", "level": 5, "timeframe": "Q4 2025"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T20:21:07.938Z"}	2025-05-07 20:21:08.308	2025-05-07 20:14:04.527526
27	3	New Goal Map	{"goals": [{"id": "goal-1746649980970-w7f6a5m", "text": "Test for agent", "level": 1, "timeframe": "07/05/25"}, {"id": "goal-1746649988113-xcv8pee", "text": "Test for agent 2", "level": 3, "timeframe": "07/05/25"}], "nodes": [{"id": "goal-1746649980970-w7f6a5m", "text": "Test for agent", "type": "goal", "level": 1, "timeframe": "07/05/25"}, {"id": "goal-1746649988113-xcv8pee", "text": "Test for agent 2", "type": "goal", "level": 3, "timeframe": "07/05/25"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T20:33:24.797Z"}	2025-05-07 20:33:25.131	2025-05-07 20:33:22.727568
28	3	New Goal Map	{"goals": [{"id": "goal-1746650061702-cgquby6", "text": "Test ", "level": 1, "timeframe": "Test "}, {"id": "goal-1746650067467-my46eyb", "text": "Test ", "level": 4, "timeframe": ""}], "nodes": [{"id": "goal-1746650061702-cgquby6", "text": "Test ", "type": "goal", "level": 1, "timeframe": "Test "}, {"id": "goal-1746650067467-my46eyb", "text": "Test ", "type": "goal", "level": 4, "timeframe": ""}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T20:34:32.189Z"}	2025-05-07 20:34:32.496	2025-05-07 20:34:31.256538
29	3	New Goal Map	{"goals": [{"id": "goal-1746650449161-1gde3t4", "text": "Test goal", "level": 1, "timeframe": "Q3 2025"}, {"id": "goal-1746650455161-l77bfuf", "text": "Test goal", "level": 3, "timeframe": "Q3 2025"}], "nodes": [{"id": "goal-1746650449161-1gde3t4", "text": "Test goal", "type": "goal", "level": 1, "timeframe": "Q3 2025"}, {"id": "goal-1746650455161-l77bfuf", "text": "Test goal", "type": "goal", "level": 3, "timeframe": "Q3 2025"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T20:54:44.885Z"}	2025-05-07 20:54:45.202	2025-05-07 20:41:05.377849
30	3	New Goal Map	{"goals": [{"id": "goal-1746652785035-5671t2b", "text": "Test ", "level": 1, "timeframe": ""}, {"id": "goal-1746652789870-liptoic", "text": "Test ", "level": 4, "timeframe": "07/05/25"}], "nodes": [{"id": "goal-1746652785035-5671t2b", "text": "Test ", "type": "goal", "level": 1, "timeframe": ""}, {"id": "goal-1746652789870-liptoic", "text": "Test ", "type": "goal", "level": 4, "timeframe": "07/05/25"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T21:19:59.887Z"}	2025-05-07 21:20:00.21	2025-05-07 21:19:58.15748
31	3	New Goal Map	{"goals": [{"id": "goal-1746653508198-ecewpmc", "text": "Test 1", "level": 1, "timeframe": ""}, {"id": "goal-1746653514745-51f9gaq", "text": "Test  2", "level": 4, "timeframe": ""}], "nodes": [{"id": "goal-1746653508198-ecewpmc", "text": "Test 1", "type": "goal", "level": 1, "timeframe": ""}, {"id": "goal-1746653514745-51f9gaq", "text": "Test  2", "type": "goal", "level": 4, "timeframe": ""}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T21:32:13.912Z"}	2025-05-07 21:32:14.254	2025-05-07 21:32:00.772353
32	3	New Goal Map	{"goals": [{"id": "goal-1746654327022-ewozy9n", "text": "Test1 ", "level": 1, "timeframe": ""}, {"id": "goal-1746654330480-24zev8i", "text": "Test 3", "level": 2, "timeframe": ""}], "nodes": [{"id": "goal-1746654327022-ewozy9n", "text": "Test1 ", "type": "goal", "level": 1, "timeframe": ""}, {"id": "goal-1746654330480-24zev8i", "text": "Test 3", "type": "goal", "level": 2, "timeframe": ""}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T21:45:50.343Z"}	2025-05-07 21:45:50.697	2025-05-07 21:45:38.580495
36	3	New Goal Map	{"goals": [{"id": "goal-1746656140534-l7pw7tf", "text": "Test 1", "level": 1, "timeframe": "Q3 2025"}, {"id": "goal-1746656149021-7m7h4j2", "text": "Test 2", "level": 2, "timeframe": "Q4 2025"}], "projectId": "3", "lastUpdated": 1746656158308}	2025-05-07 22:15:58.308	2025-05-07 22:15:57.324486
33	3	New Goal Map	{"data": {"goals": [{"id": "goal-1746654763977-f03q9nz", "text": "Test 1", "level": 1, "timeframe": ""}, {"id": "goal-1746654767400-gxazmaf", "text": "Test 3 ", "level": 3, "timeframe": ""}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T21:53:18.467Z", "lastUpdated": 1746654798467}, "name": "Goal Map", "projectId": "3"}	2025-05-07 21:53:18.467	2025-05-07 21:52:55.735592
34	3	New Goal Map	{"data": {"goals": [{"id": "goal-1746655068556-pz3woum", "text": "Test 1", "level": 1, "timeframe": "07/05/2025"}, {"id": "goal-1746655077041-iwz4sn7", "text": "Test 2", "level": 4, "timeframe": "Q3 2025"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T21:58:17.824Z", "lastUpdated": 1746655097824}, "name": "Goal Map", "projectId": "3"}	2025-05-07 21:58:17.824	2025-05-07 21:58:06.655057
35	3	Goal Map	{"goals": [{"id": "goal-1746655668644-cvc6yjp", "text": "Test ", "level": 1, "timeframe": ""}, {"id": "goal-1746655671271-cge5b6e", "text": "Test ", "level": 1, "timeframe": ""}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T22:07:55.259Z", "lastUpdated": 1746655675259}	2025-05-07 22:07:55.259	2025-05-07 22:07:54.052576
38	3	New Goal Map	{"goals": [{"id": "goal-1746657253232-ymy90k8", "text": "Test Goal", "level": 1, "timeframe": "1"}, {"id": "goal-1746657259731-dm0jfou", "text": "Test ", "level": 4, "timeframe": "2"}], "nodes": [{"id": "goal-1746657253232-ymy90k8", "text": "Test Goal", "type": "goal", "level": 1, "timeframe": "1"}, {"id": "goal-1746657259731-dm0jfou", "text": "Test ", "type": "goal", "level": 4, "timeframe": "2"}], "version": "1.0", "projectId": "3", "timestamp": "2025-05-07T22:34:24.987Z"}	2025-05-07 22:34:25.428	2025-05-07 22:34:25.446416
37	3	New Goal Map	{"goals": [{"id": "goal-1746656686856-ed00v54", "text": "Test goal 1", "level": 1, "timeframe": "Q3 2025"}, {"id": "goal-1746656694729-0fmvzp5", "text": "Test goal 2", "level": 2, "timeframe": "Q3 2026"}, {"id": "goal-1746786946456-gevxvqc", "text": "Test goal 3", "level": 2, "timeframe": ""}], "projectId": "349b8ad7-a85b-41c0-a5ea-bae873b0b315", "lastUpdated": 1746786956513}	2025-05-09 10:35:56.513	2025-05-07 22:25:03.516472
\.


--
-- Data for Name: organisation_heuristics; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.organisation_heuristics (id, organisation_id, success_factor, goal, metric, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: organisation_memberships; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.organisation_memberships (id, user_id, organisation_id, role, created_at, updated_at) FROM stdin;
b135ab3f-0d32-49df-bb1d-2bac89a6e9dc	3	4e12a776-ed78-4dfe-9849-380c46a59e52	owner	2025-05-15 09:26:13.49	2025-05-15 09:26:13.49
\.


--
-- Data for Name: organisations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.organisations (id, name, description, created_at, updated_at) FROM stdin;
4e12a776-ed78-4dfe-9849-380c46a59e52	Test Organisation 1505	\N	2025-05-15 09:26:13.441	2025-05-15 09:26:13.441
\.


--
-- Data for Name: personal_heuristics; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.personal_heuristics (id, name, description, favourite, project_id, created_at, updated_at) FROM stdin;
c48c3feb-7bf4-4eac-b501-eea91ee3ad3a	Test 	Test	f	5	2025-05-12 11:54:01.456077+00	2025-05-12 11:54:01.456077+00
3dc366d3-34ed-4467-90f1-496736a3a221	Test 12/05/25	Test Text	f	5	2025-05-12 14:53:41.133997+00	2025-05-12 14:53:41.133997+00
2335de93-c9c3-4f6e-9ebc-eb428652c35d	Test 3	Test 3	f	5	2025-05-12 14:58:20.316137+00	2025-05-12 14:58:20.316137+00
26e793ca-2a92-4d30-b124-d8c582c1d570	Test 4	Test 4	f	5	2025-05-12 14:58:28.401846+00	2025-05-12 14:58:28.401846+00
8231bc25-3e03-4de3-b33c-11d9a72825b3	Test 5	Test 5	f	5	2025-05-12 14:58:42.192333+00	2025-05-12 14:58:42.192333+00
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.plans (id, project_id, user_id, name, blocks, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: project_tasks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.project_tasks (id, project_id, title, description, factor_id, stage, status, due_date, assigned_to, created_at, updated_at, sort_order, completed, task_notes, task_type, text, origin, source_id, notes, priority, owner) FROM stdin;
\.


--
-- Data for Name: project_tasks_backup; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.project_tasks_backup (id, project_id, text, stage, origin, source_id, completed, notes, priority, due_date, owner, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.projects (id, user_id, name, description, goal_map_id, cynefin_selection_id, tcof_journey_id, last_updated, created_at, organisation_id, sector, custom_sector, org_type, team_size, current_stage, is_profile_complete, organisation_size, industry) FROM stdin;
11	3	Test Project 1505	\N	\N	\N	\N	2025-05-15 09:26:41.03	2025-05-15 09:26:41.03	4e12a776-ed78-4dfe-9849-380c46a59e52	\N	\N	\N	\N	\N	f	\N	\N
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.session (sid, sess, expire) FROM stdin;
_HVIwfThKD76pu2QQywtL2Gb-DM_2g9x	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-06T14:26:59.235Z","httpOnly":true,"path":"/"},"passport":{"user":3}}	2025-06-07 19:13:18
4oxu73qCB0e63koHtCY11VRoYVDC37in	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-04T18:41:13.104Z","httpOnly":true,"path":"/"},"passport":{"user":4}}	2025-06-04 18:41:14
B9i0qDBiQK39MJaJdpViYzj7EIKgjNX-	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-04T18:41:21.124Z","httpOnly":true,"path":"/"},"passport":{"user":4}}	2025-06-04 18:41:22
GfN5U4o1NlVbcp2bY3JPaV8cIfmX1SOD	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-03T23:34:25.267Z","httpOnly":true,"path":"/"},"passport":{"user":3}}	2025-06-08 16:10:51
RmICKu_E64TW2k76ozVG_vmX_awN0qAr	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-04T18:41:06.312Z","httpOnly":true,"path":"/"},"passport":{"user":4}}	2025-06-04 18:41:07
LFJPDITRkYOrL4be1oTYSFIsriS6pNUd	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-08T19:58:48.424Z","httpOnly":true,"path":"/"}}	2025-06-08 20:12:13
z7C4Uy6sp6bgUSrYm8N2cYoOcaA3DxMm	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-06T11:34:21.537Z","httpOnly":true,"path":"/"},"passport":{"user":3}}	2025-06-07 17:46:26
icR7OQ0zg_J-GXrAVHzwgFNUClZF0s2y	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-01T07:34:57.959Z","httpOnly":true,"path":"/"},"passport":{"user":3}}	2025-06-11 08:51:17
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
qwfvVz_dMQjawP9gd7gciWBGxe6P95D0	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-08T06:58:33.043Z","httpOnly":true,"path":"/"}}	2025-06-08 06:58:34
nKzNX71yD7iaqsgqc8l58VG8UHBY6QSA	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-12T19:14:04.689Z","httpOnly":true,"path":"/"},"passport":{"user":2}}	2025-06-12 19:14:05
CZnzOFJ8Ajgx71AoA08PElDYoEDtA28g	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-13T23:26:23.971Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-13 23:26:24
Fr2O6F_GZ8CHkRltEOuXFYrjZoXSo1AZ	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-13T23:26:29.687Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-13 23:26:30
CsjL5Nu0u5nmKabY2R2M-OK_oLHyi5s-	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-13T23:26:34.793Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-13 23:26:35
xAY03MS-4jACT0oKTo8WsTrao3Fmjej_	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-13T19:42:55.720Z","httpOnly":true,"path":"/"},"passport":{"user":7}}	2025-06-13 19:42:56
xY4raW_J6ob7HqtaH5tLEKYElEJEaj54	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-13T23:26:47.136Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":2}}	2025-06-13 23:26:48
a3NLWPNAp_uoMedkOqF67cTBVuYShQ-L	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-14T05:43:17.180Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-14 05:43:18
Au4bjvgEfE39EWqsdsF6cYrzwBERFDkR	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-12T19:00:41.759Z","httpOnly":true,"path":"/"}}	2025-06-12 19:00:42
miMhCEep1pBb4MTvX8KXDG9vbg0m3m89	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-11T10:42:11.407Z","httpOnly":true,"path":"/"},"passport":{"user":3}}	2025-06-13 06:55:23
KzHo_j4euSVLFX5gZP3JzJVmsCVkaMgU	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-13T22:11:52.901Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":2}}	2025-06-13 22:11:53
JCQNBAlDJYGaP939OKKIEaNDmbIFk864	{"cookie":{"originalMaxAge":2591999997,"expires":"2025-06-13T23:55:54.451Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-13 23:55:55
OR7hyhLcMV4mI_1zzJ4eS2pNMM-MW9Dl	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-13T22:11:08.863Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-13 22:11:09
YaXPcI5i1YGhtJL6reD2ov3fkIkiru_V	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-13T23:25:23.054Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-13 23:25:24
C127pOu51g5_62gueJGcJrCljJ7czXM9	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-13T23:39:49.364Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-13 23:39:50
W1UEYguxTO9l-Sk9mj6u5FCfgcr-2_ll	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-14T05:43:33.593Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-14 05:43:34
8px4OZScF0lszFVztI3ReaHEEl3QUso5	{"cookie":{"originalMaxAge":2591999999,"expires":"2025-06-13T21:57:51.343Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-13 21:57:52
yl9nDJtVVMyPLjK9DL22RiouLV6vR1XD	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-13T19:57:18.862Z","httpOnly":true,"path":"/"},"passport":{"user":3}}	2025-06-13 19:57:19
HiNXCANeDxqbU93tTj04slCqq8FZKVBH	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-13T19:57:25.117Z","httpOnly":true,"path":"/"},"passport":{"user":3}}	2025-06-13 19:57:26
p7y4yemHHS49Yr6s1-aTGeFGu1mtDgxk	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-13T22:09:26.178Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-13 22:09:27
JXHz-wwpX_0YTn7qeI1O53OPyGStfl1u	{"cookie":{"originalMaxAge":2591999999,"expires":"2025-06-13T21:38:07.006Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-13 21:51:24
5zYBAA3XRuQJ70fqOZtaMrKh9r5VQDcf	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-13T22:10:57.425Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-13 22:10:58
AJ9pwD13ONZrksSbDiwKyHkhaLOLX7Ek	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-14T07:35:53.746Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-14 07:35:54
Wk8rj_z2FdIFCjhlm4qMs-vrHs0cygh2	{"cookie":{"originalMaxAge":2591999999,"expires":"2025-06-13T21:28:21.587Z","httpOnly":true,"path":"/"},"passport":{"user":3}}	2025-06-13 21:54:53
OnLVNMOwj33f5DLxKz3wt1No1PZqfP3J	{"cookie":{"originalMaxAge":2591999997,"expires":"2025-06-14T06:11:12.676Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-14 06:11:13
sTFsfbBdLkdQwoWHCXzL5Cy4PMoc6AZS	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-13T23:19:59.577Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-13 23:20:00
GC_873AWpxiL7p2cOm33zg8ak3400pwS	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-14T06:03:09.801Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-14 06:03:10
1jlTAAR0pNS9_50z8g5vFj7TZmSR81Yf	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-14T06:03:47.845Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-14 06:03:48
2Qfn3_E4K1R6RV9hSKy1EvWpElTBfc1R	{"cookie":{"originalMaxAge":2591999996,"expires":"2025-06-14T09:49:24.990Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-06-14 09:49:25
RXS4hlGmhBPS1N_AP7aPb4a4MTHQfpsO	{"cookie":{"originalMaxAge":2591999970,"expires":"2025-06-14T11:22:07.968Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":3}}	2025-06-14 11:22:08
\.


--
-- Data for Name: success_factor_ratings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.success_factor_ratings (id, project_id, factor_id, resonance, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: success_factor_tasks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.success_factor_tasks (id, factor_id, stage, text, "order", created_at, updated_at) FROM stdin;
0b61230f-7e44-457a-8b01-8f711995c0dd	sf-1	Identification	Talk to 3 to 5 key stakeholders	0	2025-05-13 15:47:19.563068	2025-05-13 15:47:19.563068
cc2203db-fb5c-4f2d-990d-9748e6f7876e	sf-1	Identification	Ask what frustrates them and what a win looks like	1	2025-05-13 15:47:19.63233	2025-05-13 15:47:19.63233
a7452696-6b59-4f87-80e3-94be5d837939	sf-1	Identification	"Draft a clear purpose statement, refine the goals, update the Success Map"	2	2025-05-13 15:47:19.674219	2025-05-13 15:47:19.674219
84843b2c-9622-40b7-8d78-f41e2c7f2860	sf-2	Identification	Define the type of person you need	0	2025-05-13 15:47:19.718636	2025-05-13 15:47:19.718636
1c12b3aa-29e4-479a-899d-01fdd1685fbc	sf-2	Identification	Find a leader	1	2025-05-13 15:47:19.755993	2025-05-13 15:47:19.755993
9639ceae-6df1-4168-8be8-112b6deebe4b	sf-2	Identification	Get access to additional support (if needed)	2	2025-05-13 15:47:19.793929	2025-05-13 15:47:19.793929
287b82b5-cf40-499b-85fb-88051d81a4ed	sf-2	Definition	Confirm you have access to a master builder ready for the next stage	0	2025-05-13 15:47:19.83251	2025-05-13 15:47:19.83251
17442ef7-90e5-4959-9f2b-e71139384af7	sf-3	Identification	Get a team that has worked with your masterbuilder (if possible)	0	2025-05-13 15:47:19.870227	2025-05-13 15:47:19.870227
afded5a3-c415-4107-93de-6f6e015810a7	sf-3	Identification	Identify early champions (if there is business change)	1	2025-05-13 15:47:19.913357	2025-05-13 15:47:19.913357
488ed843-8ba2-4079-88df-efd08dbe5892	sf-3	Identification	Run team development workshops	2	2025-05-13 15:47:19.955028	2025-05-13 15:47:19.955028
a7e13b55-528d-4980-858e-de40252e7337	sf-3	Definition	Build support with Change Champions	0	2025-05-13 15:47:19.994297	2025-05-13 15:47:19.994297
e6cf1043-ce1c-4d30-a97b-6ace5af9fe29	sf-3	Definition	Get Your People on the Bus: Build team productivity	1	2025-05-13 15:47:20.033105	2025-05-13 15:47:20.033105
6f06c3b1-c590-4e53-8592-a21c7afecda9	sf-3	Delivery	Support champions to influence others	0	2025-05-13 15:47:20.070937	2025-05-13 15:47:20.070937
cf9b5187-a605-4635-9279-788645e1f175	sf-3	Delivery	Setup the team to be productive	1	2025-05-13 15:47:20.10818	2025-05-13 15:47:20.10818
a888ee55-5e41-4fb3-93f8-e670a47222fc	sf-4	Identification	Create a plan to engage with other stakeholders	0	2025-05-13 15:47:20.153236	2025-05-13 15:47:20.153236
049163c4-17b2-460f-9ea0-7ad2f7536e12	sf-4	Identification	"Engage stakeholders, customers, and users"	1	2025-05-13 15:47:20.194082	2025-05-13 15:47:20.194082
5400c1c1-7db5-49a3-849f-7bbde1eed330	sf-4	Identification	Develop a mechanism to foster transparency and involve stakeholders in key decisions	2	2025-05-13 15:47:20.236991	2025-05-13 15:47:20.236991
af41b541-b649-47f8-987a-7c5fe5ed60b8	sf-4	Definition	"Stakeholder communications, training and engagement"	0	2025-05-13 15:47:20.27427	2025-05-13 15:47:20.27427
e54105f5-b976-4f9b-b8c5-79ca1d41c8c9	sf-4	Definition	"Empower stakeholders, users, customers to support decision making"	1	2025-05-13 15:47:20.312681	2025-05-13 15:47:20.312681
84b0d4ae-cffc-4a02-8eb7-686aa541c564	sf-4	Delivery	"Stakeholder communications, training and engagement"	0	2025-05-13 15:47:20.353023	2025-05-13 15:47:20.353023
1a762eaa-4416-498b-83ca-75b60ca67aea	sf-4	Delivery	"Empower stakeholders, users, customers to support decision making"	1	2025-05-13 15:47:20.393444	2025-05-13 15:47:20.393444
0f11d449-2a71-4178-8acf-7465883ac0ad	sf-5	Identification	Identify and learn lessons from three people or projects that have achieved similar outcomes	0	2025-05-13 15:47:20.437813	2025-05-13 15:47:20.437813
4b30a196-bb42-408f-8457-141631e54320	sf-5	Identification	"Find out how long their projects took, what they cost, and whether the expected value was delivered"	1	2025-05-13 15:47:20.476836	2025-05-13 15:47:20.476836
0d7beaa7-785a-42e6-99ac-2e0d48ab8c8c	sf-5	Identification	Apply these insights to your plan	2	2025-05-13 15:47:20.524152	2025-05-13 15:47:20.524152
bf4e3073-90eb-4676-b861-4be8f786af6d	sf-5	Definition	Reengage with past projects to learn new lessons about the next stage	0	2025-05-13 15:47:20.574452	2025-05-13 15:47:20.574452
3622cbe5-c090-438d-acb2-96c996b90d6c	sf-6	Identification	Identify three delivery methods using tried and tested techniques	0	2025-05-13 15:47:20.623701	2025-05-13 15:47:20.623701
05816986-9846-41d5-9547-7fb95b8be721	sf-6	Identification	Validate your best option through prototyping and customer or user feedback	1	2025-05-13 15:47:20.664177	2025-05-13 15:47:20.664177
15da1412-64c6-48a8-81a9-5f73f3e397d0	sf-6	Identification	"Complete a pros and cons list for each option. Rate against: Use of tried and tested methods, Likelihood of delivering goals, Modularity and scalability, Ease of building a minimum or maximum viable product. Include metrics where possible."	2	2025-05-13 15:47:20.71331	2025-05-13 15:47:20.71331
785bb77c-59d7-4e2c-8817-345f0b0ad762	sf-7	Identification	Start Small",Answer the question: what is my Lego?	0	2025-05-13 15:47:20.76099	2025-05-13 15:47:20.76099
78831934-7cb6-4a7b-9b36-de67b2884b95	sf-7	Identification	Start Small",Ensure people and plans are in place to develop the solution in stage 2	1	2025-05-13 15:47:20.807712	2025-05-13 15:47:20.807712
e11c4b19-97d8-4f75-a9e1-1087114e0c64	sf-7	Definition	Start Small","Develop module as a minimum viable product, if possible. Otherwise, develop a maximum virtual product."	0	2025-05-13 15:47:20.851771	2025-05-13 15:47:20.851771
becc9d53-e191-4f7c-aeaf-3af9ab2f92df	sf-7	Definition	Start Small",Validate that the solution will achieve the goals.	1	2025-05-13 15:47:20.895894	2025-05-13 15:47:20.895894
eb5ed617-c5e8-49db-81cf-7ce8ca6faf3f	sf-7	Delivery	Start Small",Scale up and go big. Roll out sections / modular solution to other areas	0	2025-05-13 15:47:20.933133	2025-05-13 15:47:20.933133
c16eb946-bd1c-4d22-a055-4fea2499c72b	sf-8	Identification	Generate experiential learning to test key assumptions	0	2025-05-13 15:47:20.975265	2025-05-13 15:47:20.975265
4701e527-2241-4418-9e36-c0a12c7f2442	sf-8	Identification	"Start regular reflection sessions: weekly, fortnightly, or monthly"	1	2025-05-13 15:47:21.021488	2025-05-13 15:47:21.021488
144fb1ba-f7a7-421e-aa04-f77ac4f29e2f	sf-8	Identification	"Create a plan to develop an minimum viable product, or where this isnâ€™t possible, a maximum virtual product in in Stage 2"	2	2025-05-13 15:47:21.060802	2025-05-13 15:47:21.060802
b6cc3706-0cb0-4e30-a49d-6a5a6a743b60	sf-8	Definition	"Develop module as a minimum viable product, if possible. Otherwise, develop a maximum virtual product."	0	2025-05-13 15:47:21.098317	2025-05-13 15:47:21.098317
7193e506-0cf8-416b-a1be-9318926f3755	sf-8	Definition	Continue regular learning and reflection sessions (at least monthly)	1	2025-05-13 15:47:21.146443	2025-05-13 15:47:21.146443
b8058fe5-b2ee-439b-8273-5d754f43c400	sf-8	Delivery	Continue regular learning and reflection sessions (at least monthly)	0	2025-05-13 15:47:21.185306	2025-05-13 15:47:21.185306
85d20dc6-22dd-4976-a190-e50789a03eb0	sf-9	Identification	List your top five risks now	0	2025-05-13 15:47:21.24287	2025-05-13 15:47:21.24287
a98a6447-9975-493a-b6be-95d8b9cbcfe5	sf-9	Identification	Create a mitigation plan for each one	1	2025-05-13 15:47:21.319452	2025-05-13 15:47:21.319452
32a48e80-0c5a-44af-928b-08d4081f9596	sf-9	Identification	Review and update your risk plan monthly (or more often).	2	2025-05-13 15:47:21.371788	2025-05-13 15:47:21.371788
7cc63529-ad54-4f3c-9ddb-9ff449372516	sf-9	Definition	Continuously identify and mitigate risks (at least monthly)	0	2025-05-13 15:47:21.414009	2025-05-13 15:47:21.414009
e1de80cd-f69d-4356-a7ea-282794a3ed47	sf-9	Delivery	Continuously identify and mitigate risks (at least monthly)	0	2025-05-13 15:47:21.463742	2025-05-13 15:47:21.463742
ba122745-795c-49cd-b113-d1881ea66881	sf-10	Identification	Compare how long similar projects took in Stage 2 and 3 versus their original estimates	0	2025-05-13 15:47:21.508716	2025-05-13 15:47:21.508716
dd3087b5-01a2-4b32-a5a8-79b0f88e2187	sf-10	Identification	Adjust your forecast based on this optimism allowance and include contingency	1	2025-05-13 15:47:21.547508	2025-05-13 15:47:21.547508
89ed4a66-a2c6-4f41-8ddd-387bc71dd54e	sf-10	Definition	"Look to previous projects to identify level of optimism for Stage 3, apply this contingency % to your estimate for time / cost / resources required for stage 3"	0	2025-05-13 15:47:21.589366	2025-05-13 15:47:21.589366
45fbadaf-6f0e-45c6-8861-e2597f4d85d9	sf-10	Delivery	"Build optimism allowances into all forecasts, big and small."	0	2025-05-13 15:47:21.631204	2025-05-13 15:47:21.631204
4d02b662-c73f-4f7a-8a07-2450ae495dee	sf-11	Identification	Be Ready to Step Away",Identify the success measures for your solution in Stage 2	0	2025-05-13 15:47:21.668708	2025-05-13 15:47:21.668708
c25f0cbe-a4dc-412c-a2cb-3c431782fa9f	sf-11	Identification	Be Ready to Step Away",Confirm the business case do the benefits outweigh the costs?	1	2025-05-13 15:47:21.708763	2025-05-13 15:47:21.708763
2b20181f-715a-4d42-b6d2-1e315b4d550d	sf-11	Definition	Be Ready to Step Away",Identify the measurable success measures for your solution in Stage 3	0	2025-05-13 15:47:21.746653	2025-05-13 15:47:21.746653
1dbd4282-b955-450b-8f84-d2a57f580d42	sf-11	Definition	Be Ready to Step Away",Confirm the business case do the benefits outweigh the costs?	1	2025-05-13 15:47:21.785296	2025-05-13 15:47:21.785296
962dff16-a4b3-43c3-9455-ea1df9ebdff9	sf-11	Definition	Be Ready to Step Away","Confirm you've used data to validate your chosen option and plan, including optimism bias"	2	2025-05-13 15:47:21.825386	2025-05-13 15:47:21.825386
27da2643-14d3-4189-816a-89ef7aff1833	sf-11	Delivery	Be Ready to Step Away",Confirm the built solution meets your goals. Measure this with metrics.	0	2025-05-13 15:47:21.863907	2025-05-13 15:47:21.863907
9d8b62b1-aaf3-48a5-b458-dfd8e1387c8c	sf-11	Closure	Be Ready to Step Away",Record results for posterity	0	2025-05-13 15:47:21.903456	2025-05-13 15:47:21.903456
bb04c727-2197-4704-8df1-7deb20df9482	sf-11	Closure	Be Ready to Step Away","	1	2025-05-13 15:47:21.943247	2025-05-13 15:47:21.943247
7e6d5889-6359-463e-aac3-c535d88dcc26	sf-12	Identification	Set up regular meetings with key people to adapt to a changing world	0	2025-05-13 15:47:22.036379	2025-05-13 15:47:22.036379
b31310ab-f42f-4598-94b4-1142d75f5bf7	sf-12	Definition	Adapt the requirements / plan / scope based as new information comes to light.	0	2025-05-13 15:47:22.082609	2025-05-13 15:47:22.082609
26f61092-fb05-46fc-a85c-743bd0ff9c37	sf-12	Delivery	Adapt the requirements / plan / scope based as new information comes to light.	0	2025-05-13 15:47:22.13509	2025-05-13 15:47:22.13509
\.


--
-- Data for Name: success_factors; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.success_factors (id, title, description, tasks) FROM stdin;
sf-1	1.1 Ask Why		{}
sf-2	1.2 Get a Masterbuilder		{}
sf-3	1.3 Get Your People on the Bus		{}
sf-4	1.4 Make Friends and Keep them Friendly		{}
sf-6	2.2 Look for Tried & Tested Options		{}
sf-7	3.1 Think Big, Start Small		{}
sf-8	3.2 Learn by Experimenting		{}
sf-9	3.3 Keep on top of risks		{}
sf-10	4.1 Adjust for optimism		{}
sf-11	4.2 Measure What Matters, Be Ready to Step Away		{}
sf-12	4.3 Be Ready to Adapt		{}
sf-5	2.1 Recognise that your project is not unique	Test	{}
\.


--
-- Data for Name: tcof_journeys; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tcof_journeys (id, user_id, name, data, last_updated, created_at) FROM stdin;
1	3	My TCOF Journey	{"notes": {}, "stage": "identification", "lastUpdated": 1746468676709}	2025-05-05 18:11:17.417	2025-05-05 18:11:17.436824
2	3	My TCOF Journey	{"notes": {}, "stage": "definition", "metrics": {"primary": [], "evaluationFrequency": null}, "priority": null, "lastUpdated": 1746561486954, "capabilities": {"resources": null, "technicalExpertise": 3}, "implementation": {"timeframe": null, "constraints": []}}	2025-05-06 19:58:07.685	2025-05-06 19:58:07.709075
3	3	My TCOF Journey	{"notes": {}, "stage": "definition", "metrics": {"primary": [], "evaluationFrequency": null}, "priority": null, "lastUpdated": 1746603394302, "capabilities": {"resources": null, "technicalExpertise": 3}, "implementation": {"timeframe": null, "constraints": []}}	2025-05-07 07:36:33.441	2025-05-07 07:36:33.453153
4	3	My TCOF Journey	{"notes": {}, "stage": "identification", "metrics": {"primary": [], "evaluationFrequency": null}, "priority": null, "lastUpdated": 1746634292698, "capabilities": {"resources": null, "technicalExpertise": 3}, "implementation": {"timeframe": null, "constraints": []}}	2025-05-07 16:11:32.927	2025-05-07 16:11:32.946156
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, email, created_at, avatar_url, notification_prefs, locale, timezone) FROM stdin;
4	test_user	e595bca0763045a7d975661c6badb7e98cce639f1529703877661706f3d9ef120c99a0f03b9486479efe138710157222db25e7bc42f8ce52526eea9a70ca1bf7.c3a0c434e66405e1d8f0ec9528c14ecc	test@example.com	2025-05-05 18:41:05.835	\N	{}	en-US	UTC
5	testuser2	da5e1833710b10a8ce2e8e3c1eaf1a7a922f0af63a6259bcff5fc8e6cc166a3f.e5d2437c19fc8e2726dc1f8e99b457eb	test2@example.com	2025-05-09 06:58:32.865	\N	{}	en-US	UTC
1	Greg	f951060eb3e021c17e0099eca497616f71dd1541e16574596d230b4f52f4ffaa.96cb454f34cd326893389cdee81c6bfa	greg.krawczyk@confluity.co.uk	2025-05-01 19:15:46.647351	\N	{}	en-US	UTC
1746742166	admin	19eaade314c61eeced6965fc013bff8aee981c558e8a2f55513623d4c908c997.b55afad4636587a65b6ab379c190ab0d	admin@example.com	2025-05-08 22:09:26.325451	\N	{}	en-US	UTC
6	greg.krawczyk@confluity.co.uk	eb07208fcd71e633203f73b57617c78d99d8039d555f78077f292cc85e765001.15bf8bcd1dcf636c2bbda7121acc4ead	greg.krawczyk@confluity.co.uk	2025-05-09 10:15:50.701	\N	{}	en-US	UTC
3	greg@confluity.co.uk	bfdead44346451b08cf92577a47f59a39074302784bc29dc81393a4c7b301579.db8ee9d6d1f4107716f6750e3d1d91f7	greg@confluity.co.uk	2025-05-02 05:26:17.990731	\N	{}	en-US	UTC
2	testuser	ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f	\N	2025-05-01 19:40:36.066456	\N	{}	en-US	UTC
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: test_migration; Owner: neondb_owner
--

COPY test_migration.plans (id, legacy_project_id, project_id, name, created_at) FROM stdin;
1	11	00000000-000b-4000-8000-000000000000	Test Plan	2025-05-15 11:16:18.93002
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: test_migration; Owner: neondb_owner
--

COPY test_migration.projects (legacy_id, id, name, description, user_id, organisation_id, created_at) FROM stdin;
11	00000000-000b-4000-8000-000000000000	Test Project 1505	\N	3	4e12a776-ed78-4dfe-9849-380c46a59e52	2025-05-15 11:15:24.415121
\.


--
-- Data for Name: success_factor_ratings; Type: TABLE DATA; Schema: test_migration; Owner: neondb_owner
--

COPY test_migration.success_factor_ratings (id, legacy_project_id, project_id, factor_id, rating, created_at) FROM stdin;
1	11	00000000-000b-4000-8000-000000000000	sf-1	5	2025-05-15 11:16:18.93002
\.


--
-- Name: cynefin_selections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.cynefin_selections_id_seq', 17, true);


--
-- Name: goal_maps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.goal_maps_id_seq', 38, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.projects_id_seq', 11, true);


--
-- Name: tcof_journeys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.tcof_journeys_id_seq', 4, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 7, true);


--
-- Name: plans_id_seq; Type: SEQUENCE SET; Schema: test_migration; Owner: neondb_owner
--

SELECT pg_catalog.setval('test_migration.plans_id_seq', 1, false);


--
-- Name: success_factor_ratings_id_seq; Type: SEQUENCE SET; Schema: test_migration; Owner: neondb_owner
--

SELECT pg_catalog.setval('test_migration.success_factor_ratings_id_seq', 1, false);


--
-- Name: cynefin_selections cynefin_selections_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cynefin_selections
    ADD CONSTRAINT cynefin_selections_pkey PRIMARY KEY (id);


--
-- Name: goal_maps goal_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.goal_maps
    ADD CONSTRAINT goal_maps_pkey PRIMARY KEY (id);


--
-- Name: organisation_heuristics organisation_heuristics_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organisation_heuristics
    ADD CONSTRAINT organisation_heuristics_pkey PRIMARY KEY (id);


--
-- Name: organisation_memberships organisation_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organisation_memberships
    ADD CONSTRAINT organisation_memberships_pkey PRIMARY KEY (id);


--
-- Name: organisations organisations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisations_pkey PRIMARY KEY (id);


--
-- Name: personal_heuristics personal_heuristics_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.personal_heuristics
    ADD CONSTRAINT personal_heuristics_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: project_tasks project_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: success_factor_ratings success_factor_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.success_factor_ratings
    ADD CONSTRAINT success_factor_ratings_pkey PRIMARY KEY (id);


--
-- Name: success_factor_ratings success_factor_ratings_project_id_factor_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.success_factor_ratings
    ADD CONSTRAINT success_factor_ratings_project_id_factor_id_key UNIQUE (project_id, factor_id);


--
-- Name: success_factor_tasks success_factor_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.success_factor_tasks
    ADD CONSTRAINT success_factor_tasks_pkey PRIMARY KEY (id);


--
-- Name: success_factors success_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.success_factors
    ADD CONSTRAINT success_factors_pkey PRIMARY KEY (id);


--
-- Name: tcof_journeys tcof_journeys_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tcof_journeys
    ADD CONSTRAINT tcof_journeys_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: test_migration; Owner: neondb_owner
--

ALTER TABLE ONLY test_migration.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: test_migration; Owner: neondb_owner
--

ALTER TABLE ONLY test_migration.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: success_factor_ratings success_factor_ratings_pkey; Type: CONSTRAINT; Schema: test_migration; Owner: neondb_owner
--

ALTER TABLE ONLY test_migration.success_factor_ratings
    ADD CONSTRAINT success_factor_ratings_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: IDX_sessions_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_sessions_expire" ON public.sessions USING btree (expire);


--
-- Name: idx_projects_org; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_projects_org ON public.projects USING btree (organisation_id);


--
-- Name: idx_success_factor_ratings_project; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_success_factor_ratings_project ON public.success_factor_ratings USING btree (project_id);


--
-- Name: project_tasks_factor_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX project_tasks_factor_id_idx ON public.project_tasks USING btree (factor_id);


--
-- Name: project_tasks_project_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX project_tasks_project_id_idx ON public.project_tasks USING btree (project_id);


--
-- Name: project_tasks_stage_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX project_tasks_stage_idx ON public.project_tasks USING btree (stage);


--
-- Name: project_tasks_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX project_tasks_status_idx ON public.project_tasks USING btree (status);


--
-- Name: user_org_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX user_org_idx ON public.organisation_memberships USING btree (user_id, organisation_id);


--
-- Name: cynefin_selections cynefin_selections_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cynefin_selections
    ADD CONSTRAINT cynefin_selections_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: success_factor_tasks fk_success_factor; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.success_factor_tasks
    ADD CONSTRAINT fk_success_factor FOREIGN KEY (factor_id) REFERENCES public.success_factors(id) ON DELETE CASCADE;


--
-- Name: goal_maps goal_maps_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.goal_maps
    ADD CONSTRAINT goal_maps_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: organisation_heuristics organisation_heuristics_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organisation_heuristics
    ADD CONSTRAINT organisation_heuristics_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE CASCADE;


--
-- Name: organisation_memberships organisation_memberships_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organisation_memberships
    ADD CONSTRAINT organisation_memberships_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE CASCADE;


--
-- Name: organisation_memberships organisation_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organisation_memberships
    ADD CONSTRAINT organisation_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: plans plans_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: plans plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: projects projects_cynefin_selection_id_cynefin_selections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_cynefin_selection_id_cynefin_selections_id_fk FOREIGN KEY (cynefin_selection_id) REFERENCES public.cynefin_selections(id);


--
-- Name: projects projects_goal_map_id_goal_maps_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_goal_map_id_goal_maps_id_fk FOREIGN KEY (goal_map_id) REFERENCES public.goal_maps(id);


--
-- Name: projects projects_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE SET NULL;


--
-- Name: projects projects_tcof_journey_id_tcof_journeys_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_tcof_journey_id_tcof_journeys_id_fk FOREIGN KEY (tcof_journey_id) REFERENCES public.tcof_journeys(id);


--
-- Name: projects projects_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: success_factor_ratings success_factor_ratings_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.success_factor_ratings
    ADD CONSTRAINT success_factor_ratings_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: tcof_journeys tcof_journeys_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tcof_journeys
    ADD CONSTRAINT tcof_journeys_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: plans plans_project_id_fkey; Type: FK CONSTRAINT; Schema: test_migration; Owner: neondb_owner
--

ALTER TABLE ONLY test_migration.plans
    ADD CONSTRAINT plans_project_id_fkey FOREIGN KEY (project_id) REFERENCES test_migration.projects(id);


--
-- Name: success_factor_ratings success_factor_ratings_project_id_fkey; Type: FK CONSTRAINT; Schema: test_migration; Owner: neondb_owner
--

ALTER TABLE ONLY test_migration.success_factor_ratings
    ADD CONSTRAINT success_factor_ratings_project_id_fkey FOREIGN KEY (project_id) REFERENCES test_migration.projects(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

